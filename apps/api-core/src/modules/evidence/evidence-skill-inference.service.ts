import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Effect } from 'effect';
import {
  ACTIVE_TAXONOMY_VERSION,
  AssessmentResultSchema,
  FUSION_RULE_SET_VERSION,
  GetSkillEvidenceInferenceResponseSchema,
  ProjectVerificationReportDtoSchema,
  REDIS_TTL_SECONDS,
  SMART_TOPICS,
  SkillEvidenceInferenceSnapshotSchema,
  SkillInferenceUpdatedDataSchema,
  getSkillBlueprint,
  type AssessmentResult,
  type ProficiencyLevel,
  type SkillEvidenceInferenceSnapshot,
} from '@smart/contracts';
import {
  assessmentToObservationBundle,
  projectBundleFromQlixEvidence,
  runSkillEvidenceFusion,
} from '@smart/scoring-engine';
import { CAPABILITY_INFERENCE_PROMPT_REF } from '@smart/prompts';
import { QlixSmartAssessmentSchema } from '../evaluation/qlix-client.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import {
  buildFusionCapabilityRows,
  fusionCapabilityModelVersion,
  FUSION_CAPABILITY_MODEL_PREFIX,
} from './fusion-capability-sync.js';

const CAPABILITY_MODEL_VERSION = 'capability-inference-v1' as const;
const SKILL_INFERENCE_RUBRIC_VERSION = 'fusion-rubric@1' as const;

function redisKey(studentId: string, skillCode: string): string {
  return `skill-evidence-inference:${studentId}:${skillCode}`;
}

@Injectable()
export class EvidenceSkillInferenceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async getForStudent(studentId: string, skillCode: string) {
    const cached = await this.redis.get(redisKey(studentId, skillCode));
    if (cached) {
      return GetSkillEvidenceInferenceResponseSchema.parse(JSON.parse(cached));
    }
    // Check if durable inference provenance exists in DB (survives Redis TTL expiry - I314)
    const existing = await this.prisma.studentCapability.findFirst({
      where: {
        studentId,
        skillCode,
        modelVersion: { startsWith: FUSION_CAPABILITY_MODEL_PREFIX },
      },
      orderBy: { inferredAt: 'desc' },
    });
    if (existing) {
      // Recompute fresh snapshot to populate Redis and return full provenance
      return this.recomputeForSkill(studentId, skillCode);
    }
    return this.recomputeForSkill(studentId, skillCode);
  }

  async recomputeForStudentSkills(studentId: string, skillCodes: readonly string[]): Promise<void> {
    const unique = [...new Set(skillCodes.map((c) => c.trim()).filter(Boolean))];
    for (const skillCode of unique) {
      await this.recomputeForSkill(studentId, skillCode);
    }
  }

  async recomputeForSkill(studentId: string, skillCode: string) {
    const blueprint = getSkillBlueprint(skillCode);
    if (!blueprint?.competencyModel?.length) {
      throw new NotFoundException({
        error: 'skill_blueprint_missing',
        message: 'No competency blueprint for this skill.',
        statusCode: 404,
      });
    }

    const previousRaw = await this.redis.get(redisKey(studentId, skillCode));
    const previousParsed = previousRaw
      ? SkillEvidenceInferenceSnapshotSchema.safeParse(JSON.parse(previousRaw))
      : null;
    const previousProficiency =
      previousParsed?.success === true ? previousParsed.data.inferredProficiency : null;

    const { projectBundles, evidenceRecordIds, promptRefs } = await this.loadProjectBundles(
      studentId,
      skillCode,
      blueprint.competencyModel,
    );

    const assessmentBundle = await this.loadAssessmentBundle(studentId, skillCode, blueprint);

    const targetProficiency =
      (await this.resolveTargetProficiency(studentId, skillCode)) ??
      ('BEGINNER' as ProficiencyLevel);

    const computedAt = new Date().toISOString();
    const inference = await runSkillEvidenceFusion({
      skillCode,
      competencyModel: blueprint.competencyModel,
      proficiencyRequirements: blueprint.proficiencyRequirements ?? [],
      targetProficiency,
      assessmentBundle,
      projectBundles,
      provenance: {
        ruleSetVersion: FUSION_RULE_SET_VERSION,
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        rubricVersion: SKILL_INFERENCE_RUBRIC_VERSION,
        capabilityModelVersion: CAPABILITY_MODEL_VERSION,
        assessmentBlueprintRef: blueprint.assessmentBlueprint ?? undefined,
        interviewBlueprintRef: blueprint.interviewBlueprint ?? undefined,
        promptRefs: [...new Set([CAPABILITY_INFERENCE_PROMPT_REF, ...promptRefs])],
        evidenceRecordIds,
      },
    }).pipe(Effect.runPromise);

    const snapshot = SkillEvidenceInferenceSnapshotSchema.parse({
      studentId,
      skillCode,
      outcome: inference.outcome,
      inferredProficiency: inference.inferredProficiency,
      confidence: inference.confidence,
      confidenceReason: inference.confidenceReason,
      proficiencyInferenceReason: inference.proficiencyInferenceReason,
      evidenceCount: inference.evidenceCount,
      provenance: {
        ...inference.provenance,
        computedAt,
      },
      fusion: inference.fusion,
      ...(previousProficiency !== inference.inferredProficiency
        ? { previousInferredProficiency: previousProficiency }
        : {}),
    });

    await this.redis.setex(
      redisKey(studentId, skillCode),
      REDIS_TTL_SECONDS.skillEvidenceInference,
      JSON.stringify(snapshot),
    );

    await this.persistFusionCapabilities(snapshot);

    if (previousProficiency !== inference.inferredProficiency) {
      await this.publishLevelChange(studentId, skillCode, snapshot, previousProficiency);
    }

    return GetSkillEvidenceInferenceResponseSchema.parse(snapshot);
  }

  async fuseForVerification(
    studentId: string,
    catalogSkillCode: string,
    assessmentResult: {
      competencyResults: AssessmentResult['competencyResults'];
      targetProficiency: ProficiencyLevel;
    },
  ) {
    const blueprint = getSkillBlueprint(catalogSkillCode);
    if (!blueprint?.competencyModel?.length) return null;

    const { projectBundles, evidenceRecordIds, promptRefs } = await this.loadProjectBundles(
      studentId,
      catalogSkillCode,
      blueprint.competencyModel,
    );

    const assessmentBundle = assessmentToObservationBundle({
      competencyResults: assessmentResult.competencyResults,
      testedItemCount: assessmentResult.competencyResults.filter((r) => r.status !== 'NOT_TESTED')
        .length,
      proctoringRiskHigh: false,
      competencyModel: blueprint.competencyModel,
    });

    const inference = await runSkillEvidenceFusion({
      skillCode: catalogSkillCode,
      competencyModel: blueprint.competencyModel,
      proficiencyRequirements: blueprint.proficiencyRequirements ?? [],
      targetProficiency: assessmentResult.targetProficiency,
      assessmentBundle,
      projectBundles,
      provenance: {
        ruleSetVersion: FUSION_RULE_SET_VERSION,
        taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
        rubricVersion: SKILL_INFERENCE_RUBRIC_VERSION,
        capabilityModelVersion: CAPABILITY_MODEL_VERSION,
        promptRefs: [...new Set([CAPABILITY_INFERENCE_PROMPT_REF, ...promptRefs])],
        evidenceRecordIds,
      },
    }).pipe(Effect.runPromise);

    return inference.fusion;
  }

  /** Shared loader for skill verification fusion (I306 / I307). */
  async buildFusionProjectBundles(
    studentId: string,
    catalogSkillCode: string,
  ): Promise<{
    projectBundles: ReturnType<typeof projectBundleFromQlixEvidence>[];
    evidenceRecordIds: string[];
  }> {
    const blueprint = getSkillBlueprint(catalogSkillCode);
    if (!blueprint?.competencyModel?.length) {
      return { projectBundles: [], evidenceRecordIds: [] };
    }
    const loaded = await this.loadProjectBundles(
      studentId,
      catalogSkillCode,
      blueprint.competencyModel,
    );
    return { projectBundles: loaded.projectBundles, evidenceRecordIds: loaded.evidenceRecordIds };
  }

  private async loadProjectBundles(
    studentId: string,
    skillCode: string,
    competencyModel: { competencyId: string }[],
  ) {
    const evidenceRecords = await this.prisma.evidenceRecord.findMany({
      where: {
        studentId,
        evidenceType: 'PROJECT',
        relatedSkillCodes: { has: skillCode },
        verificationStatus: 'VERIFIED',
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    const projectBundles: ReturnType<typeof projectBundleFromQlixEvidence>[] = [];
    const evidenceRecordIds: string[] = [];
    const promptRefs: string[] = [];

    for (const record of evidenceRecords) {
      const projectId = record.sourceEntityId;
      if (!projectId) continue;

      const project = await this.prisma.project.findFirst({
        where: { id: projectId, studentId },
        include: { qlixCheckResult: true },
      });
      if (!project?.qlixCheckResult) continue;

      const reportParse = ProjectVerificationReportDtoSchema.safeParse(record.sourcePayload);
      if (!reportParse.success) continue;
      const report = reportParse.data;
      if (report.confidence < 0.5) continue;

      promptRefs.push(report.promptRef);

      const smart = project.qlixCheckResult.smartAssessmentJson
        ? QlixSmartAssessmentSchema.safeParse(project.qlixCheckResult.smartAssessmentJson)
        : null;

      projectBundles.push(
        projectBundleFromQlixEvidence(
          {
            report,
            competencyObservations: smart?.success ? (smart.data.competencyObservations ?? []) : [],
            appliedProficiencyCeiling: smart?.success ? smart.data.appliedProficiencyCeiling : null,
            evidenceRecordId: record.id,
            projectId: project.id,
          },
          { competencyModel: competencyModel as never },
        ),
      );
      evidenceRecordIds.push(record.id);
    }

    return { projectBundles, evidenceRecordIds, promptRefs };
  }

  private async loadAssessmentBundle(
    studentId: string,
    skillCode: string,
    blueprint: ReturnType<typeof getSkillBlueprint>,
  ) {
    if (!blueprint) return null;

    const attempt = await this.prisma.skillVerificationAttempt.findFirst({
      where: {
        passed: true,
        claim: { studentId, skill: { code: skillCode } },
      },
      orderBy: { createdAt: 'desc' },
      select: { assessmentResultJson: true },
    });
    if (!attempt?.assessmentResultJson) return null;

    const parsed = AssessmentResultSchema.safeParse(attempt.assessmentResultJson);
    if (!parsed.success) return null;

    return assessmentToObservationBundle({
      competencyResults: parsed.data.competencyResults,
      testedItemCount: parsed.data.competencyResults.filter((r) => r.status !== 'NOT_TESTED')
        .length,
      proctoringRiskHigh: false,
      competencyModel: blueprint.competencyModel,
    });
  }

  private async resolveTargetProficiency(
    studentId: string,
    skillCode: string,
  ): Promise<ProficiencyLevel | null> {
    const claim = await this.prisma.skillClaim.findFirst({
      where: { studentId, skill: { code: skillCode } },
      select: { proficiency: true },
    });
    if (!claim) return null;
    const level = claim.proficiency;
    if (
      level === 'BEGINNER' ||
      level === 'INTERMEDIATE' ||
      level === 'PROFICIENT' ||
      level === 'ADVANCED' ||
      level === 'PROFESSIONAL'
    ) {
      return level;
    }
    return null;
  }

  private async persistFusionCapabilities(snapshot: SkillEvidenceInferenceSnapshot): Promise<void> {
    const modelVersion = fusionCapabilityModelVersion({
      ruleSetVersion: snapshot.provenance.ruleSetVersion,
      taxonomyVersion: snapshot.provenance.taxonomyVersion,
      capabilityModelVersion:
        snapshot.provenance.capabilityModelVersion ?? CAPABILITY_MODEL_VERSION,
      rubricVersion: snapshot.provenance.rubricVersion,
    });

    await this.prisma.studentCapability.deleteMany({
      where: {
        studentId: snapshot.studentId,
        skillCode: snapshot.skillCode,
        modelVersion: { startsWith: FUSION_CAPABILITY_MODEL_PREFIX },
      },
    });

    const rows = buildFusionCapabilityRows(snapshot, modelVersion);
    if (rows.length === 0) return;

    await this.prisma.studentCapability.createMany({
      data: rows.map((row) => ({
        studentId: row.studentId,
        skillCode: row.skillCode,
        capabilityLabel: row.capabilityLabel,
        category: row.category,
        confidenceScore: row.confidenceScore,
        proficiency: row.proficiency,
        evidenceRefs: row.evidenceRefs,
        modelVersion: row.modelVersion,
        assessmentVerified: row.assessmentVerified,
        projectId: row.projectId,
        qlixCheckId: row.qlixCheckId,
      })),
    });
  }

  private async publishLevelChange(
    studentId: string,
    skillCode: string,
    snapshot: {
      outcome: string;
      inferredProficiency: string | null;
      confidence: string;
      evidenceCount: number;
      provenance: { computedAt: string };
      previousInferredProficiency?: string | null;
    },
    previousInferredProficiency: string | null,
  ): Promise<void> {
    const data = SkillInferenceUpdatedDataSchema.parse({
      userId: studentId,
      skillCode,
      outcome: snapshot.outcome,
      inferredProficiency: snapshot.inferredProficiency,
      previousInferredProficiency,
      confidence: snapshot.confidence,
      evidenceCount: snapshot.evidenceCount,
      computedAt: snapshot.provenance.computedAt,
    });
    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.skillInferenceUpdated,
      partitionKey: studentId,
      eventType: SMART_TOPICS.skillInferenceUpdated,
      source: 'evidence',
      data,
    });
  }
}
