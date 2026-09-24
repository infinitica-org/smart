import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  WorkExperienceEvidenceSchema,
  evidenceClaimFromWorkExperience,
  mapWeStatusToEvidenceVerification,
  relatedSkillCodesFromWorkExperience,
  type WorkExperienceStructuredMetadata,
  ProjectVerificationReportDtoSchema,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  buildEvidenceFromWorkExperienceRow,
  mapStructuredResponsibilities,
  type WorkExperienceWithEvidenceRelations,
} from '../work-experience/work-experience-evidence.adapter.js';
import {
  buildEvidenceFromProjectRow,
  type ProjectSourceRef,
  evidenceClaimFromProject,
  mapProjectEvidenceVerification,
  projectEvidenceReliabilityFromReport,
  projectEvidenceStrengthFromReport,
  relatedSkillCodesFromProject,
} from './project-evidence.adapter.js';
import { toReportDto, type ReportRow } from '../evaluation/project-verify.mapper.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
import { EvidenceSkillInferenceService } from './evidence-skill-inference.service.js';
import { EvidenceVersionService } from './evidence-version.service.js';
import type { EvidenceRecordRow } from './evidence-version.snapshot.js';

@Injectable()
export class EvidenceSyncService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
    @Inject(EvidenceVersionService)
    private readonly evidenceVersions: EvidenceVersionService,
    @Inject(EvidenceSkillInferenceService)
    private readonly skillInference: EvidenceSkillInferenceService,
    @Inject(EvidenceVersionService)
    private readonly evidenceVersions: EvidenceVersionService,
  ) {}

  async syncWorkExperienceEvidenceRecord(
    studentId: string,
    experienceId: string,
    overrides?: Partial<WorkExperienceStructuredMetadata>,
  ): Promise<void> {
    const row = await this.prisma.workExperience.findFirst({
      where: { id: experienceId, studentId },
      include: { structuredResponsibilities: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Work experience not found.',
        statusCode: 404,
      });
    }

    const evidence = buildEvidenceFromWorkExperienceRow(
      row as WorkExperienceWithEvidenceRelations,
      overrides,
    );
    if (!evidence) return;

    const source = {
      id: row.id,
      companyName: row.companyName,
      role: row.role,
      employmentType: row.employmentType,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate ? row.endDate.toISOString() : null,
      workLocation: row.workLocation,
      department: row.department,
      responsibilities: row.responsibilities,
      skillsClaimed: row.skills,
      status: row.status,
      verifierName: row.verifierName,
      verifierEmail: row.verifierEmail,
      verifierDesignation: row.verifierDesignation,
      verifierPhone: row.verifierPhone,
      structuredResponsibilities:
        overrides?.structuredResponsibilities ??
        mapStructuredResponsibilities(row.structuredResponsibilities),
      deliverables: evidence.deliverables,
      personalContributions: evidence.personalContributions,
      skillMappings: evidence.skillMappings,
    };

    const existing = await this.prisma.evidenceRecord.findFirst({
      where: {
        studentId,
        evidenceType: 'WORK_EXPERIENCE',
        sourceEntityId: experienceId,
      },
      include: { artifacts: true },
    });

    const mappedStatus = mapWeStatusToEvidenceVerification(row.status);

    const payload = {
      studentId,
      evidenceType: 'WORK_EXPERIENCE' as const,
      source: 'CANDIDATE' as const,
      sourceEntityId: experienceId,
      relatedSkillCodes: relatedSkillCodesFromWorkExperience(source),
      verificationStatus: mappedStatus,
      claim: evidenceClaimFromWorkExperience(source),
      context: row.responsibilities,
      sourceOwner: row.verifierName,
      sourceReference: row.verifierEmail,
      evidenceDate: row.endDate?.toISOString() ?? row.startDate.toISOString(),
      submissionDate: row.createdAt,
      sourcePayload: WorkExperienceEvidenceSchema.parse(evidence) as Prisma.InputJsonValue,
      accessibility: 'PRIVATE',
    };

    const organizationId = await this.evidenceVersions.resolveStudentOrganizationId(studentId);

    if (existing) {
      const mergedCandidate = {
        ...existing,
        ...payload,
      } as EvidenceRecordRow;

      if (this.evidenceVersions.contentEquals(existing, mergedCandidate)) {
        return;
      }

      const contentHash = this.evidenceVersions.hashContent(mergedCandidate);
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.evidenceRecord.update({
          where: { id: existing.id },
          data: payload,
          include: { artifacts: true },
        });

        await this.evidenceVersions.appendVersion(tx, updated, {
          mutationKey: `we-sync:${experienceId}:${contentHash}`,
          actorId: null,
          organizationId,
          source: 'SYSTEM',
          priorVerificationStatus: existing.verificationStatus,
          newVerificationStatus: updated.verificationStatus,
        });
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.evidenceRecord.create({
          data: payload,
          include: { artifacts: true },
        });

        await this.evidenceVersions.createInitialVersion(tx, created, {
          mutationKey: `create:${created.id}`,
          actorId: studentId,
          organizationId,
          source: created.source,
          priorVerificationStatus: null,
          newVerificationStatus: created.verificationStatus,
        });
      });
    }

    await this.reconciliation.reconcileForStudent(studentId);
    await this.skillInference.recomputeForStudentSkills(studentId, payload.relatedSkillCodes);
  }

  async syncProjectEvidenceRecord(studentId: string, projectId: string): Promise<void> {
    const row = await this.prisma.project.findFirst({
      where: { id: projectId, studentId },
      include: {
        skillMappings: true,
        report: true,
      },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Project not found.',
        statusCode: 404,
      });
    }
    const prismaReport = row.report;
    if (!prismaReport) return;

    const reportRow: ReportRow = {
      id: prismaReport.id,
      projectId: row.id,
      score: prismaReport.score,
      plagiarismFlag: prismaReport.plagiarismFlag,
      techAgeFlag: prismaReport.techAgeFlag,
      relevanceScore: prismaReport.relevanceScore,
      explanation: prismaReport.explanation,
      routedToReview: prismaReport.routedToReview,
      createdAt: prismaReport.createdAt,
    };
    const reportDto = toReportDto(reportRow);

    const evidence = buildEvidenceFromProjectRow({
      id: row.id,
      studentId: row.studentId,
      title: row.title,
      problem: row.problem,
      approach: row.approach,
      stack: row.stack,
      outcome: row.outcome,
      loomUrl: row.loomUrl,
      githubUrl: row.githubUrl,
      liveUrl: row.liveUrl,
      status: row.status,
      snapshotSha: row.snapshotSha,
      qlixCheckId: row.qlixCheckId,
      skillMappings: row.skillMappings,
      report: {
        id: prismaReport.id,
        projectId: row.id,
        score: prismaReport.score.toNumber(),
        plagiarismFlag: prismaReport.plagiarismFlag,
        techAgeFlag: prismaReport.techAgeFlag,
        relevanceScore: prismaReport.relevanceScore.toNumber(),
        explanation: prismaReport.explanation,
        routedToReview: prismaReport.routedToReview,
        createdAt: prismaReport.createdAt,
      },
    });
    if (!evidence) return;

    const source: ProjectSourceRef = {
      id: row.id,
      title: row.title,
      problem: row.problem,
      approach: row.approach,
      stack: row.stack,
      outcome: row.outcome,
      githubUrl: row.githubUrl,
      liveUrl: row.liveUrl,
      loomUrl: row.loomUrl,
      status: row.status,
      skillMappings: row.skillMappings,
    };

    const existing = await this.prisma.evidenceRecord.findFirst({
      where: {
        studentId,
        evidenceType: 'PROJECT',
        sourceEntityId: projectId,
      },
    });

    const verificationStatus = mapProjectEvidenceVerification({
      projectStatus: row.status,
      report: reportDto,
    });
    const evidenceStrength = projectEvidenceStrengthFromReport(reportDto);
    const evidenceReliability = projectEvidenceReliabilityFromReport(reportDto);

    const payload = {
      studentId,
      evidenceType: 'PROJECT' as const,
      source: 'CANDIDATE' as const,
      sourceEntityId: projectId,
      relatedSkillCodes: relatedSkillCodesFromProject(source),
      verificationStatus,
      ...(evidenceStrength ? { evidenceStrength } : {}),
      ...(evidenceReliability ? { evidenceReliability } : {}),
      claim: evidenceClaimFromProject(source),
      context: row.problem,
      sourceOwner: row.studentId,
      sourceReference: row.githubUrl,
      evidenceDate: row.createdAt.toISOString(),
      submissionDate: row.createdAt,
      sourcePayload: {
        ...ProjectVerificationReportDtoSchema.parse(reportDto),
        studentId,
        title: row.title,
        problem: row.problem,
        approach: row.approach,
        stack: row.stack,
        outcome: row.outcome,
        loomUrl: row.loomUrl,
        githubUrl: row.githubUrl,
        liveUrl: row.liveUrl,
        status: row.status,
        skillMappings: row.skillMappings,
      } as Prisma.InputJsonValue,
      accessibility: 'PRIVATE',
    };

    if (existing) {
      await this.prisma.evidenceRecord.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await this.prisma.evidenceRecord.create({ data: payload });
    }

    await this.reconciliation.reconcileForStudent(studentId);
    await this.skillInference.recomputeForStudentSkills(studentId, payload.relatedSkillCodes);
  }

  /** Links the project evidence row to each tagged skill claim (Advanced/Professional gates). */
  async linkProjectEvidenceToTaggedClaims(
    studentId: string,
    projectId: string,
    skillCodes: readonly string[],
  ): Promise<void> {
    const evidence = await this.prisma.evidenceRecord.findFirst({
      where: { studentId, evidenceType: 'PROJECT', sourceEntityId: projectId },
      select: { id: true },
    });
    if (!evidence) return;

    const uniqueCodes = [...new Set(skillCodes.map((code) => code.trim()).filter(Boolean))];
    for (const skillCode of uniqueCodes) {
      const claim = await this.prisma.skillClaim.findFirst({
        where: { studentId, skill: { code: skillCode } },
        select: { id: true },
      });
      if (!claim) continue;
      await this.prisma.skillClaimEvidenceLink.upsert({
        where: { claimId_evidenceId: { claimId: claim.id, evidenceId: evidence.id } },
        create: { claimId: claim.id, evidenceId: evidence.id, weight: 1 },
        update: { weight: 1 },
      });
    }
  }
}
