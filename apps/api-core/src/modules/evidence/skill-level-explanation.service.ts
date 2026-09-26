import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssessmentResultSchema,
  GetEmployerSkillInspectionResponseSchema,
  GetSkillLevelExplanationResponseSchema,
  ProjectVerificationReportDtoSchema,
  getSkillBlueprint,
  getSkillDefinition,
  type ProficiencyLevel,
} from '@smart/contracts';
import { buildEmployerSkillInspection, buildSkillLevelExplanation } from '@smart/scoring-engine';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { EvidenceSkillInferenceService } from './evidence-skill-inference.service.js';
import { assertCanReadCandidateEvidenceVersions } from './evidence-version-auth.helper.js';

const MS_PER_DAY = 86_400_000;

function asProficiency(value: string | null | undefined): ProficiencyLevel | null {
  if (
    value === 'BEGINNER' ||
    value === 'INTERMEDIATE' ||
    value === 'PROFICIENT' ||
    value === 'ADVANCED' ||
    value === 'PROFESSIONAL'
  ) {
    return value;
  }
  return null;
}

@Injectable()
export class SkillLevelExplanationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
  ) {}

  async getForStudent(studentId: string, skillCode: string) {
    const payload = await this.buildPayload(studentId, skillCode);
    return GetSkillLevelExplanationResponseSchema.parse(payload);
  }

  async getCandidateSkillExplanation(caller: RequestUser, studentId: string, skillCode: string) {
    const access = await assertCanReadCandidateEvidenceVersions(this.prisma, caller, studentId);

    const explanation = await this.getForStudent(studentId, skillCode);
    const inference = await this.skillInference.getForStudent(studentId, skillCode);
    const inspection = buildEmployerSkillInspection(
      studentId,
      explanation,
      inference.evidenceCount,
    );

    if (access.redacted && inspection.reportRefs) {
      inspection.reportRefs = inspection.reportRefs.map((ref) => ({
        ...ref,
        promptRef: undefined,
      }));
    }

    return GetEmployerSkillInspectionResponseSchema.parse(inspection);
  }

  async getForEmployerInspection(institutionId: string, studentId: string, skillCode: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, institutionId, role: 'STUDENT' },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Student not found for this institution.',
        statusCode: 404,
      });
    }

    const explanation = await this.getForStudent(studentId, skillCode);
    const inference = await this.skillInference.getForStudent(studentId, skillCode);
    const inspection = buildEmployerSkillInspection(
      studentId,
      explanation,
      inference.evidenceCount,
    );
    return GetEmployerSkillInspectionResponseSchema.parse(inspection);
  }

  private async buildPayload(studentId: string, skillCode: string) {
    const blueprint = getSkillBlueprint(skillCode);
    if (!blueprint?.competencyModel?.length) {
      throw new NotFoundException({
        error: 'skill_blueprint_missing',
        message: 'No competency blueprint for this skill.',
        statusCode: 404,
      });
    }

    const skillName = getSkillDefinition(skillCode)?.name ?? skillCode;
    const maxAgeDays = blueprint.freshnessPolicy?.maxAgeDays;

    const claim = await this.prisma.skillClaim.findFirst({
      where: { studentId, skill: { code: skillCode } },
      select: {
        status: true,
        proficiency: true,
        finalProficiency: true,
        verificationAttempts: {
          where: { passed: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            explanation: true,
            assessmentResultJson: true,
            assessmentAttemptId: true,
            createdAt: true,
          },
        },
      },
    });

    const latestAttempt = claim?.verificationAttempts[0] ?? null;
    let assessment: {
      attemptId: string;
      highestSupportedProficiency: ProficiencyLevel | null;
      confidence: 'LOW' | 'MEDIUM' | 'HIGH';
      evaluatedAt: string;
      interviewExplanation?: string | null;
    } | null = null;

    if (latestAttempt?.assessmentResultJson) {
      const parsed = AssessmentResultSchema.safeParse(latestAttempt.assessmentResultJson);
      if (parsed.success) {
        assessment = {
          attemptId: parsed.data.attemptId,
          highestSupportedProficiency: parsed.data.highestAssessmentSupportedProficiency,
          confidence: parsed.data.confidence,
          evaluatedAt: parsed.data.evaluatedAt,
          interviewExplanation: latestAttempt.explanation,
        };
      }
    }

    const inference = await this.skillInference.getForStudent(studentId, skillCode);

    const evidenceRecords = await this.prisma.evidenceRecord.findMany({
      where: {
        studentId,
        relatedSkillCodes: { has: skillCode },
        verificationStatus: 'VERIFIED',
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        evidenceType: true,
        claim: true,
        updatedAt: true,
        sourcePayload: true,
        sourceEntityId: true,
      },
    });

    const now = Date.now();
    const freshnessRows = evidenceRecords.map((record) => {
      const ageDays = Math.max(0, Math.floor((now - record.updatedAt.getTime()) / MS_PER_DAY));
      const label =
        record.claim?.trim().slice(0, 120) ||
        (record.evidenceType === 'PROJECT' ? 'Verified project' : record.evidenceType);
      return {
        evidenceId: record.id,
        label,
        ageDays,
        maxAgeDays,
      };
    });

    const reportRefs: {
      kind: 'ASSESSMENT_ATTEMPT' | 'PROJECT_VERIFICATION';
      id: string;
      label: string;
      evaluatedAt?: string;
      promptRef?: string;
    }[] = [];

    if (assessment) {
      reportRefs.push({
        kind: 'ASSESSMENT_ATTEMPT',
        id: assessment.attemptId,
        label: 'Skill verification assessment',
        evaluatedAt: assessment.evaluatedAt,
      });
    } else if (latestAttempt?.assessmentAttemptId) {
      reportRefs.push({
        kind: 'ASSESSMENT_ATTEMPT',
        id: latestAttempt.assessmentAttemptId,
        label: 'Skill verification assessment',
        evaluatedAt: latestAttempt.createdAt.toISOString(),
      });
    }

    for (const record of evidenceRecords) {
      if (record.evidenceType !== 'PROJECT') continue;
      const reportParse = ProjectVerificationReportDtoSchema.safeParse(record.sourcePayload);
      reportRefs.push({
        kind: 'PROJECT_VERIFICATION',
        id: record.id,
        label: record.claim?.trim().slice(0, 120) || 'Project verification report',
        evaluatedAt: reportParse.success ? reportParse.data.createdAt : undefined,
        promptRef: reportParse.success ? reportParse.data.promptRef : undefined,
      });
    }

    const verifiedProficiency =
      claim?.status === 'VERIFIED'
        ? asProficiency(claim.finalProficiency ?? claim.proficiency)
        : null;

    return buildSkillLevelExplanation({
      skillCode,
      skillName,
      claimStatus: claim?.status ?? 'DECLARED',
      verifiedProficiency,
      assessment,
      inference,
      freshnessRows,
      reportRefs,
      computedAt: new Date().toISOString(),
    });
  }
}
