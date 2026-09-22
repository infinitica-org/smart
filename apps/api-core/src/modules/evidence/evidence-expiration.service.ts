import { Inject, Injectable, Optional } from '@nestjs/common';
import type { EvidenceType, EvidenceVerificationStatus } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { EvidenceReconciliationService } from './evidence-reconciliation.service.js';

const EXPIRABLE_FROM_STATUSES: EvidenceVerificationStatus[] = [
  'PENDING',
  'PROVISIONAL',
  'VERIFIED',
  'DISPUTED',
];

export type ExpireEvidenceOutcome =
  'expired' | 'already_expired' | 'not_due' | 'not_eligible' | 'not_found';

export interface ExpireEvidenceResult {
  outcome: ExpireEvidenceOutcome;
  evidenceId: string;
}

export interface ExpireEvidenceOptions {
  reasonCode?: string;
}

@Injectable()
export class EvidenceExpirationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceReconciliationService)
    private readonly reconciliation: EvidenceReconciliationService,
    @Optional()
    @Inject(AuditPublisherService)
    private readonly auditPublisher?: AuditPublisherService,
  ) {}

  /**
   * Called after WorkExperience.status transitions to EXPIRED via the existing
   * expire-verification BullMQ job. Syncs payload fields then expires evidence once.
   */
  async afterWorkExperienceVerificationExpired(
    studentId: string,
    experienceId: string,
  ): Promise<ExpireEvidenceResult | null> {
    const experience = await this.prisma.workExperience.findFirst({
      where: { id: experienceId, studentId },
      select: { status: true },
    });
    if (!experience || experience.status !== 'EXPIRED') {
      return null;
    }

    const evidence = await this.prisma.evidenceRecord.findFirst({
      where: {
        studentId,
        evidenceType: 'WORK_EXPERIENCE',
        sourceEntityId: experienceId,
      },
      select: { id: true },
    });
    if (!evidence) {
      return { outcome: 'not_found', evidenceId: experienceId };
    }

    return this.expireEvidenceIfDue(evidence.id, { reasonCode: 'evidence_expired' });
  }

  /**
   * Scans credentials with expiryDate in the past and expires linked evidence rows.
   */
  async scanAndExpireDueCredentials(): Promise<{ scanned: number; expired: number }> {
    const credentials = await this.prisma.professionalCredential.findMany({
      where: { expiryDate: { not: null } },
      select: { id: true, studentId: true, expiryDate: true, status: true },
    });

    let expired = 0;
    for (const credential of credentials) {
      if (!credential.expiryDate || !isPastExpiryDate(credential.expiryDate)) {
        continue;
      }

      const evidenceRows = await this.prisma.evidenceRecord.findMany({
        where: {
          studentId: credential.studentId,
          evidenceType: 'CREDENTIAL',
          sourceEntityId: credential.id,
        },
        select: { id: true },
      });
      if (evidenceRows.length === 0) {
        continue;
      }

      let credentialEvidenceExpired = false;
      for (const evidence of evidenceRows) {
        const result = await this.expireEvidenceIfDue(evidence.id, {
          reasonCode: 'evidence_expired',
        });
        if (result.outcome === 'expired') {
          credentialEvidenceExpired = true;
          expired += 1;
        }
      }

      if (credentialEvidenceExpired) {
        await this.prisma.professionalCredential.updateMany({
          where: {
            id: credential.id,
            status: { notIn: ['EXPIRED', 'REVOKED'] },
          },
          data: { status: 'EXPIRED' },
        });
      }
    }

    return { scanned: credentials.length, expired };
  }

  async expireEvidenceIfDue(
    evidenceId: string,
    options: ExpireEvidenceOptions = {},
  ): Promise<ExpireEvidenceResult> {
    const record = await this.prisma.evidenceRecord.findUnique({
      where: { id: evidenceId },
    });
    if (!record) {
      return { outcome: 'not_found', evidenceId };
    }

    if (record.verificationStatus === 'EXPIRED') {
      return { outcome: 'already_expired', evidenceId };
    }

    if (record.verificationStatus === 'REJECTED') {
      return { outcome: 'not_eligible', evidenceId };
    }

    if (
      !EXPIRABLE_FROM_STATUSES.includes(record.verificationStatus as EvidenceVerificationStatus)
    ) {
      return { outcome: 'not_eligible', evidenceId };
    }

    const due = await this.isEvidenceDueForExpiration(record);
    if (!due) {
      return { outcome: 'not_due', evidenceId };
    }

    const priorState = {
      verificationStatus: record.verificationStatus,
      source: record.source,
      evidenceType: record.evidenceType,
    };

    const updateResult = await this.prisma.evidenceRecord.updateMany({
      where: {
        id: evidenceId,
        verificationStatus: { in: [...EXPIRABLE_FROM_STATUSES] },
      },
      data: { verificationStatus: 'EXPIRED' },
    });

    if (updateResult.count === 0) {
      const refreshed = await this.prisma.evidenceRecord.findUnique({
        where: { id: evidenceId },
        select: { verificationStatus: true },
      });
      if (refreshed?.verificationStatus === 'EXPIRED') {
        return { outcome: 'already_expired', evidenceId };
      }
      return { outcome: 'not_eligible', evidenceId };
    }

    const reasonCode = options.reasonCode ?? 'evidence_expired';

    if (this.auditPublisher) {
      await this.auditPublisher.record({
        actorId: null,
        action: 'evidence.updated',
        resourceType: 'evidence_record',
        resourceId: evidenceId,
        reasonCode,
        metadata: {
          priorState,
          newState: {
            verificationStatus: 'EXPIRED',
            source: record.source,
            evidenceType: record.evidenceType,
          },
          source: record.source,
          evidenceType: record.evidenceType,
        },
      });
    }

    await this.reconciliation.reconcileForStudent(record.studentId);

    return { outcome: 'expired', evidenceId };
  }

  private async isEvidenceDueForExpiration(record: {
    studentId: string;
    evidenceType: EvidenceType | string;
    sourceEntityId: string | null;
    freshness: Prisma.JsonValue;
  }): Promise<boolean> {
    if (record.evidenceType === 'WORK_EXPERIENCE' && record.sourceEntityId) {
      const experience = await this.prisma.workExperience.findFirst({
        where: { id: record.sourceEntityId, studentId: record.studentId },
        select: { status: true },
      });
      return experience?.status === 'EXPIRED';
    }

    if (record.evidenceType === 'CREDENTIAL' && record.sourceEntityId) {
      const credential = await this.prisma.professionalCredential.findFirst({
        where: { id: record.sourceEntityId, studentId: record.studentId },
        select: { expiryDate: true },
      });
      if (!credential?.expiryDate) {
        return false;
      }
      return isPastExpiryDate(credential.expiryDate);
    }

    return false;
  }
}

export function isPastExpiryDate(expiryDate: string, now = new Date()): boolean {
  const trimmed = expiryDate.trim();
  if (!trimmed) {
    return false;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return now.getTime() > Date.parse(`${trimmed}T23:59:59.999Z`);
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return false;
  }
  return now.getTime() > parsed;
}
