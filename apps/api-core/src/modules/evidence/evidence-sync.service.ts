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
import { EvidenceExpirationService } from './evidence-expiration.service.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';

@Injectable()
export class EvidenceSyncService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
    @Inject(EvidenceExpirationService)
    private readonly expiration: EvidenceExpirationService,
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

    if (mappedStatus === 'EXPIRED') {
      const { verificationStatus: _status, ...payloadWithoutStatus } = payload;

      if (existing) {
        await this.prisma.evidenceRecord.update({
          where: { id: existing.id },
          data: payloadWithoutStatus,
        });
        await this.expiration.expireEvidenceIfDue(existing.id, {
          reasonCode: 'evidence_expired',
        });
      } else {
        const created = await this.prisma.evidenceRecord.create({
          data: { ...payloadWithoutStatus, verificationStatus: 'PENDING' },
        });
        await this.expiration.expireEvidenceIfDue(created.id, {
          reasonCode: 'evidence_expired',
        });
      }
      return;
    }

    if (existing) {
      await this.prisma.evidenceRecord.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      await this.prisma.evidenceRecord.create({ data: payload });
    }

    await this.reconciliation.reconcileForStudent(studentId);
  }
}
