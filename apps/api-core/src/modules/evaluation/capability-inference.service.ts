import { Inject, Injectable, Logger } from '@nestjs/common';
import { getSkillBlueprint, getSkillDefinition, type ProficiencyLevel } from '@smart/contracts';
import {
  CAPABILITY_INFERENCE_PROMPT_REF,
  CapabilityInferenceOutputSchema,
  capabilityInferenceTemplate,
} from '@smart/prompts';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { QlixClient, QlixSmartAssessmentSchema, type QlixSmartAssessment } from './qlix-client.js';

const MODEL_VERSION = 'capability-inference-v1' as const;

const DEMONSTRATED_STATUSES = new Set(['DEMONSTRATED', 'PARTIALLY_DEMONSTRATED']);

function confidenceFromQlix(level?: string | null): number {
  if (level === 'HIGH') return 0.85;
  if (level === 'MEDIUM') return 0.65;
  if (level === 'LOW') return 0.45;
  return 0.5;
}

function proficiencyFromObservation(
  observationStatus: string | undefined,
  ceiling: string | null | undefined,
  difficulty: ProficiencyLevel | undefined,
): ProficiencyLevel {
  if (observationStatus === 'DEMONSTRATED' && ceiling) {
    const normalized = ceiling.toUpperCase();
    if (
      normalized === 'BEGINNER' ||
      normalized === 'INTERMEDIATE' ||
      normalized === 'PROFICIENT' ||
      normalized === 'ADVANCED' ||
      normalized === 'PROFESSIONAL'
    ) {
      return normalized;
    }
  }
  return difficulty ?? 'BEGINNER';
}

@Injectable()
export class CapabilityInferenceService {
  private readonly logger = new Logger(CapabilityInferenceService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QlixClient) private readonly qlix: QlixClient,
    @Inject(AiGatewayService) private readonly gateway: AiGatewayService,
  ) {}

  async inferForProject(projectId: string, studentId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { qlixCheckResult: true, skillMappings: true },
    });
    if (!project || project.studentId !== studentId || !project.qlixCheckResult) {
      return 0;
    }

    const qlixRow = project.qlixCheckResult;
    const smartAssessment = project.qlixCheckResult.smartAssessmentJson
      ? QlixSmartAssessmentSchema.parse(project.qlixCheckResult.smartAssessmentJson)
      : null;

    const skillCode = project.skillMappings[0]?.skillCode ?? null;
    const definition = skillCode ? getSkillDefinition(skillCode) : undefined;
    const blueprint = skillCode ? getSkillBlueprint(skillCode) : undefined;
    const category = definition?.categoryName ?? 'Project Evidence';

    const baseline = this.inferFromSmartAssessment({
      smartAssessment,
      blueprintCompetencies: blueprint?.competencyModel ?? [],
      category,
      skillCode,
      projectId,
      qlixCheckId: qlixRow.checkId,
    });

    let capabilities = baseline;
    if (this.gateway.hasCallableProvider()) {
      try {
        const llm = await this.inferWithLlm(
          {
            title: project.title,
            problem: project.problem,
            approach: project.approach,
            outcome: project.outcome,
            stack: project.stack,
            qlixCheckResult: qlixRow,
          },
          qlixRow.checkId,
          smartAssessment,
        );
        if (llm.length > 0) {
          capabilities = llm;
        }
      } catch (error) {
        this.logger.warn(
          `LLM capability inference failed for ${projectId}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    if (capabilities.length === 0) return 0;

    const verifiedSkillCodes = new Set(
      (
        await this.prisma.skillClaim.findMany({
          where: { studentId, status: 'VERIFIED' },
          include: { skill: { select: { code: true } } },
        })
      ).map((claim) => claim.skill.code),
    );

    await this.prisma.studentCapability.deleteMany({
      where: { projectId, studentId, modelVersion: MODEL_VERSION },
    });

    await this.prisma.studentCapability.createMany({
      data: capabilities.map((cap) => ({
        studentId,
        projectId,
        skillCode,
        qlixCheckId: qlixRow.checkId,
        capabilityLabel: cap.capabilityLabel,
        category: cap.category,
        confidenceScore: cap.confidenceScore,
        proficiency: cap.proficiency,
        evidenceRefs: cap.evidenceRefs,
        modelVersion: MODEL_VERSION,
        assessmentVerified: skillCode ? verifiedSkillCodes.has(skillCode) : false,
      })),
    });

    this.logger.log(`Inferred ${capabilities.length} capabilities for project ${projectId}`);
    return capabilities.length;
  }

  private inferFromSmartAssessment(input: {
    smartAssessment: QlixSmartAssessment | null;
    blueprintCompetencies: ReadonlyArray<{
      competencyId: string;
      capability: string;
      difficulty?: ProficiencyLevel;
    }>;
    category: string;
    skillCode: string | null;
    projectId: string;
    qlixCheckId: string;
  }): Array<{
    capabilityLabel: string;
    category: string;
    confidenceScore: number;
    proficiency: ProficiencyLevel;
    evidenceRefs: string[];
  }> {
    const observations = input.smartAssessment?.competencyObservations ?? [];
    const ceiling = input.smartAssessment?.appliedProficiencyCeiling ?? null;
    const byId = new Map(input.blueprintCompetencies.map((row) => [row.competencyId, row]));

    return observations
      .filter((obs) => obs.status && DEMONSTRATED_STATUSES.has(obs.status))
      .map((obs) => {
        const blueprintRow = byId.get(obs.competencyId);
        const snippet = obs.evidenceSnippets?.[0];
        const labelBase = blueprintRow?.capability ?? `Competency ${obs.competencyId.slice(0, 8)}`;
        const capabilityLabel = snippet
          ? `${labelBase} — evidenced in project (${snippet.slice(0, 180)})`
          : `${labelBase} — demonstrated in linked project`;
        return {
          capabilityLabel: capabilityLabel.slice(0, 500),
          category: input.category,
          confidenceScore: confidenceFromQlix(obs.confidence),
          proficiency: proficiencyFromObservation(obs.status, ceiling, blueprintRow?.difficulty),
          evidenceRefs: [
            `project:${input.projectId}`,
            `qlix:${input.qlixCheckId}`,
            ...(input.skillCode ? [`skill:${input.skillCode}`] : []),
          ],
        };
      });
  }

  private async inferWithLlm(
    project: {
      title: string;
      problem: string;
      approach: string;
      outcome: string;
      stack: string;
      qlixCheckResult: {
        checkId: string;
        skillsJson: unknown;
        smartAssessmentJson: unknown;
      };
    },
    checkId: string,
    smartAssessment: QlixSmartAssessment | null,
  ): Promise<
    Array<{
      capabilityLabel: string;
      category: string;
      confidenceScore: number;
      proficiency: ProficiencyLevel;
      evidenceRefs: string[];
    }>
  > {
    const digest = this.qlix.buildDigest({
      checkId,
      status: 'completed',
      smartAssessment: smartAssessment ?? undefined,
    });
    const result = await this.gateway.complete({
      promptRef: CAPABILITY_INFERENCE_PROMPT_REF,
      modelRole: capabilityInferenceTemplate.modelRole,
      priority: 'P2_ASYNC_EVAL',
      variables: {
        projectTitle: project.title,
        projectSummary: [
          `Problem: ${project.problem}`,
          `Approach: ${project.approach}`,
          `Outcome: ${project.outcome}`,
        ].join('\n'),
        stack: project.stack,
        qlixDigest: digest,
        smartAssessmentJson: JSON.stringify(project.qlixCheckResult.smartAssessmentJson ?? {}),
        skillsDigest: JSON.stringify(project.qlixCheckResult.skillsJson ?? {}),
      },
      correlation: { responseId: project.title },
      maxOutputTokens: capabilityInferenceTemplate.maxOutputTokens,
      temperature: 0,
    });

    const parsed = CapabilityInferenceOutputSchema.parse(result.output);
    return parsed.capabilities.map((cap) => ({
      capabilityLabel: cap.capabilityLabel,
      category: cap.category,
      confidenceScore: cap.confidence,
      proficiency: cap.proficiency,
      evidenceRefs: cap.evidenceRefs,
    }));
  }
}
