import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { DataExportDownload } from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/** How long a finished export bundle can be downloaded (the object itself is swept later). */
export const EXPORT_AVAILABLE_DAYS = 7;
/** Matches StorageService's signed-URL lifetime. */
const LINK_TTL_SECONDS = 15 * 60;

/**
 * The student's own records. Rows that mainly describe other people (profile views by employers,
 * reviews they received, trust cases opened by admins) are left out.
 */
export const STUDENT_OWNED = {
  attempts: true,
  certificates: true,
  placements: true,
  savedJobs: true,
  hiddenJobs: true,
  skillClaims: true,
  projects: true,
  applications: true,
  notifications: true,
  workExperiences: true,
  candidateCertificates: true,
  candidateEducations: true,
  candidateLanguages: true,
  evidenceRecords: true,
  professionalCredentials: true,
  studentCapabilities: true,
  dataSubjectRequests: true,
  sentMessages: true,
  cognitiveProfile: true,
  communicationProfile: true,
  evidenceProfile: true,
  trustAppeals: true,
} as const;

/** Field names that hold a key in our object storage (full URLs are external and skipped). */
const STORAGE_KEY_FIELD =
  /^(storageKey|\w*ObjectKey|\w*StorageKey|supportingDocKeys|\w*[fF]ileUrl)$/;

/**
 * S6-VV-115 (#554) — builds a student's data export: every student-owned row as JSON, plus a
 * manifest of the files they uploaded. The download hands out short-lived links, never the files.
 */
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  /** Idempotent: a redelivered job for a finished request does nothing. */
  async build(requestId: string): Promise<void> {
    const request = await this.prisma.dataSubjectRequest.findUnique({ where: { id: requestId } });
    if (!request || request.type !== 'EXPORT' || request.status === 'COMPLETED') return;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: request.userId },
      omit: { passwordHash: true },
      include: STUDENT_OWNED,
    });
    const files = collectStorageKeys(user);
    const bundle = {
      exportedAt: new Date().toISOString(),
      requestId,
      data: user,
      files,
    };
    const exportKey = `dsr-exports/${request.userId}/${requestId}.json`;
    await this.storage.putObjectBuffer({
      objectKey: exportKey,
      buffer: Buffer.from(JSON.stringify(bundle, jsonReplacer, 2)),
      contentType: 'application/json',
    });

    await this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', resolvedAt: new Date(), exportKey },
    });
    await this.auditPublisher.record({
      actorId: null,
      action: 'data_request.export_completed',
      resourceType: 'data_subject_request',
      resourceId: requestId,
      reasonCode: null,
      metadata: { userId: request.userId, fileCount: files.length },
    });
    await this.notifications.notify({
      userId: request.userId,
      kind: 'ACCOUNT',
      title: 'Your data export is ready',
      body: `Download it from Settings within ${EXPORT_AVAILABLE_DAYS} days.`,
      linkUrl: `${env.STUDENT_APP_URL}/settings`,
      dedupeKey: `dsr-export:${requestId}`,
    });
    this.logger.log(`Data export ${requestId} ready (${files.length} files)`);
  }

  async download(userId: string, requestId: string): Promise<DataExportDownload> {
    const request = await this.prisma.dataSubjectRequest.findFirst({
      where: { id: requestId, userId, type: 'EXPORT', status: 'COMPLETED' },
    });
    const until = exportAvailableUntil(request);
    if (!request?.exportKey || !until || until.getTime() < Date.now()) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'This export is not available. Request a new one from Settings.',
        statusCode: 404,
      });
    }
    const bundle = JSON.parse(
      (await this.storage.getObjectBuffer(request.exportKey)).toString(),
    ) as {
      files?: string[];
    };
    const files = await Promise.all(
      (bundle.files ?? []).map(async (objectKey) => ({
        objectKey,
        url: await this.storage.getSignedDownloadUrl(objectKey),
      })),
    );
    await this.auditPublisher.record({
      actorId: userId,
      action: 'data_request.export_downloaded',
      resourceType: 'data_subject_request',
      resourceId: requestId,
      reasonCode: null,
    });
    return {
      bundleUrl: await this.storage.getSignedDownloadUrl(request.exportKey),
      files,
      linksExpireInSeconds: LINK_TTL_SECONDS,
    };
  }
}

export function exportAvailableUntil(
  request: { type: string; status: string; resolvedAt: Date | null } | null,
): Date | null {
  if (!request || request.type !== 'EXPORT' || request.status !== 'COMPLETED') return null;
  if (!request.resolvedAt) return null;
  return new Date(request.resolvedAt.getTime() + EXPORT_AVAILABLE_DAYS * 86_400_000);
}

/** Every storage key anywhere in the export, once. */
export function collectStorageKeys(value: unknown, found = new Set<string>()): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectStorageKeys(item, found));
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [key, child] of Object.entries(value)) {
      if (STORAGE_KEY_FIELD.test(key)) {
        for (const candidate of Array.isArray(child) ? child : [child]) {
          if (typeof candidate === 'string' && candidate && !/^https?:\/\//.test(candidate)) {
            found.add(candidate);
          }
        }
      } else {
        collectStorageKeys(child, found);
      }
    }
  }
  return [...found];
}

function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}
