import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  WorkExperienceEvidenceSchema,
  evidenceClaimFromWorkExperience,
  mapWeStatusToEvidenceVerification,
  relatedSkillCodesFromWorkExperience,
  type WorkExperienceStructuredMetadata,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  buildEvidenceFromWorkExperienceRow,
  mapStructuredResponsibilities,
  type WorkExperienceWithEvidenceRelations,
} from '../work-experience/work-experience-evidence.adapter.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';
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

    const payload = {
      studentId,
      evidenceType: 'WORK_EXPERIENCE' as const,
      source: 'CANDIDATE' as const,
      sourceEntityId: experienceId,
      relatedSkillCodes: relatedSkillCodesFromWorkExperience(source),
      verificationStatus: mapWeStatusToEvidenceVerification(row.status),
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
  }
}
