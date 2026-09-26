import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/index.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { AuthService } from '../auth/auth.service.js';
import { collectStorageKeys, STUDENT_OWNED } from './data-export.service.js';

/**
 * What an erasure keeps, and why. Written into the request's resolution and the audit row, so the
 * student and a DPDP reviewer can see exactly what happened.
 */
export const RETAINED_ON_ERASURE: Readonly<Record<string, string>> = {
  certificates: 'issued credentials are revoked, not deleted, so a shared link says "revoked"',
  attempts: 'assessment and integrity records back scores that were already issued',
  applications: 'the institution reports placement outcomes; rows now point at an anonymous user',
  placements: 'the institution reports placement outcomes; rows now point at an anonymous user',
  auditLogs: 'the audit trail is kept (400 days, D2); it holds ids, not personal details',
};

export interface ErasureManifest {
  deleted: Record<string, number>;
  filesDeleted: number;
  anonymized: string[];
  revokedCertificates: number;
  retained: Record<string, string>;
}

/**
 * S6-VV-117 (#555) — carries out an approved DELETION request. Safe to re-run: files are removed
 * first (deleting a missing object succeeds), then everything else happens in one transaction that
 * also closes the request, so a retry after a failure starts over cleanly.
 */
@Injectable()
export class DataErasureService {
  private readonly logger = new Logger(DataErasureService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async execute(requestId: string, actorId: string, note: string): Promise<void> {
    const request = await this.prisma.dataSubjectRequest.findUnique({ where: { id: requestId } });
    if (!request || request.type !== 'DELETION' || request.status === 'COMPLETED') return;
    const userId = request.userId;

    await this.auth.revokeAllForUser(userId);

    const owned = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      omit: { passwordHash: true },
      include: STUDENT_OWNED,
    });
    const files = collectStorageKeys(owned);
    for (const key of files) await this.storage.deleteObject(key);

    const manifest = await this.prisma.$transaction(async (tx) => {
      const byStudent = { where: { studentId: userId } };
      const byUser = { where: { userId } };
      const deleted = {
        candidateEducations: (await tx.candidateEducation.deleteMany(byStudent)).count,
        candidateLanguages: (await tx.candidateLanguage.deleteMany(byStudent)).count,
        workExperiences: (await tx.workExperience.deleteMany(byStudent)).count,
        candidateCertificates: (
          await tx.candidateCertificate.deleteMany({ where: { candidateId: userId } })
        ).count,
        savedJobs: (await tx.savedJob.deleteMany(byStudent)).count,
        hiddenJobs: (await tx.hiddenJob.deleteMany(byStudent)).count,
        notifications: (await tx.notification.deleteMany(byUser)).count,
        tokens:
          (await tx.emailVerificationToken.deleteMany(byUser)).count +
          (await tx.passwordResetToken.deleteMany(byUser)).count +
          (await tx.refreshToken.deleteMany(byUser)).count,
      };
      const revokedCertificates = (
        await tx.certificate.updateMany({
          where: { userId, status: 'ISSUED' },
          data: { status: 'REVOKED' },
        })
      ).count;
      await tx.message.updateMany({
        where: { senderId: userId, deletedAt: null },
        data: { body: '[deleted]', deletedAt: new Date() },
      });
      await tx.user.update({ where: { id: userId }, data: anonymizedUser(userId) });

      const result: ErasureManifest = {
        deleted,
        filesDeleted: files.length,
        anonymized: ['user profile', 'sent messages'],
        revokedCertificates,
        retained: RETAINED_ON_ERASURE,
      };
      await tx.dataSubjectRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          resolvedAt: new Date(),
          resolvedById: actorId,
          firstRespondedAt: request.firstRespondedAt ?? new Date(),
          resolution: `${note}\n\n${summarize(result)}`,
        },
      });
      return result;
    });

    await this.auditPublisher.record({
      actorId,
      action: 'data_request.erasure_completed',
      resourceType: 'data_subject_request',
      resourceId: requestId,
      reasonCode: note,
      metadata: { userId, ...manifest },
    });
    this.logger.log(`Erasure ${requestId} done: ${files.length} files, user ${userId} anonymized`);
  }
}

/** Personal columns cleared; role, institution and batch stay so reports still add up. */
function anonymizedUser(userId: string): Prisma.UserUpdateInput {
  return {
    email: `deleted+${userId}@deleted.invalid`,
    fullName: 'Deleted user',
    passwordHash: null,
    emailVerified: false,
    onboardingDetails: Prisma.DbNull,
    profilePhotoObjectKey: null,
    publicProfileSlug: null,
    username: null,
    usernameNormalized: null,
    groupLabel: null,
    heldReason: null,
    cgpa: null,
    sscPercentage: null,
    hscPercentage: null,
    graduationYear: null,
    profileVisible: false,
    allowEmployerMessages: false,
    deactivatedAt: new Date(),
  };
}

function summarize(manifest: ErasureManifest): string {
  const deleted = Object.entries(manifest.deleted)
    .filter(([, count]) => count > 0)
    .map(([what, count]) => `${count} ${what}`)
    .join(', ');
  return [
    `Deleted: ${deleted || 'no records'}; ${manifest.filesDeleted} uploaded files.`,
    `Anonymized: ${manifest.anonymized.join(', ')}.`,
    `Revoked certificates: ${manifest.revokedCertificates}.`,
    `Kept: ${Object.entries(manifest.retained)
      .map(([what, why]) => `${what} (${why})`)
      .join('; ')}.`,
  ].join('\n');
}
