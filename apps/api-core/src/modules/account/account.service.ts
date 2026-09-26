import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, HttpException, Inject, Injectable, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type {
  CreateDataRequest,
  DataRequestListResponse,
  DataRequestResponse,
  DeactivateAccountRequest,
  DeactivateAccountResponse,
  MessagingPreferenceResponse,
  PersonalInfoResponse,
  UpdateMessagingPreferenceRequest,
  UpdatePersonalInfoRequest,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { DSR_EXPORT_QUEUE } from '../../platform/queue/queue.names.js';
import { AuthService } from '../auth/auth.service.js';
import { exportAvailableUntil } from './data-export.service.js';
import type { DsrExportJobPayload } from './dsr-export.processor.js';

const OPEN_STATUSES = ['OPEN', 'IN_REVIEW'] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Audit the editable fields only; contact details stay out of the audit metadata. */
function pickAudited(info: PersonalInfoResponse) {
  return {
    firstName: info.firstName,
    lastName: info.lastName,
    gender: info.gender,
    dateOfBirth: info.dateOfBirth,
    graduationYear: info.graduationYear,
  };
}

/** S6-VV-115 — one export per day: a new EXPORT within 24h of the last finished one is refused. */
const EXPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function toDataRequest(row: {
  id: string;
  type: 'CORRECTION' | 'DELETION' | 'EXPORT';
  status: 'OPEN' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';
  details: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolution?: string | null;
}): DataRequestResponse {
  const until = exportAvailableUntil(row);
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    exportAvailableUntil: until && until.getTime() > Date.now() ? until.toISOString() : null,
    resolution: row.resolution ?? null,
  };
}

/** STU-02 — student self-service: personal info, messaging switch, deactivation, DPDP requests. */
@Injectable()
export class AccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Optional()
    @InjectQueue(DSR_EXPORT_QUEUE)
    private readonly exportQueue?: Queue<DsrExportJobPayload>,
  ) {}

  async getPersonalInfo(userId: string): Promise<PersonalInfoResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { fullName: true, email: true, graduationYear: true, onboardingDetails: true },
    });
    const details = asRecord(user.onboardingDetails);
    const [fallbackFirst = '', ...rest] = user.fullName.trim().split(/\s+/);
    const phoneNumber = str(details.phoneNumber);
    return {
      firstName: str(details.firstName) ?? fallbackFirst,
      lastName: str(details.lastName) ?? rest.join(' '),
      fullName: user.fullName,
      email: user.email,
      gender: str(details.gender),
      dateOfBirth: str(details.dateOfBirth),
      phone: phoneNumber ? `${str(details.phoneCountryCode) ?? ''} ${phoneNumber}`.trim() : null,
      graduationYear: user.graduationYear,
    };
  }

  async updatePersonalInfo(
    userId: string,
    body: UpdatePersonalInfoRequest,
  ): Promise<PersonalInfoResponse> {
    const before = await this.getPersonalInfo(userId);
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { onboardingDetails: true },
    });
    const details = asRecord(current.onboardingDetails);
    // Keep the onboarding snapshot in step with the columns, but never create one for a
    // student who has not finished onboarding.
    const nextDetails = current.onboardingDetails
      ? ({
          ...details,
          firstName: body.firstName,
          lastName: body.lastName,
          ...(body.gender !== undefined ? { gender: body.gender ?? undefined } : {}),
          ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth ?? undefined } : {}),
        } as Prisma.InputJsonValue)
      : undefined;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: `${body.firstName} ${body.lastName}`,
        ...(body.graduationYear !== undefined ? { graduationYear: body.graduationYear } : {}),
        ...(nextDetails ? { onboardingDetails: nextDetails } : {}),
      },
    });
    const after = await this.getPersonalInfo(userId);

    await this.auditPublisher.record({
      actorId: userId,
      action: 'personal_info.updated',
      resourceType: 'user',
      resourceId: userId,
      reasonCode: null,
      metadata: {
        prior: pickAudited(before),
        next: pickAudited(after),
      },
    });
    return after;
  }

  async getMessagingPreference(userId: string): Promise<MessagingPreferenceResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { allowEmployerMessages: true },
    });
    return { allowEmployerMessages: user.allowEmployerMessages };
  }

  async updateMessagingPreference(
    userId: string,
    body: UpdateMessagingPreferenceRequest,
  ): Promise<MessagingPreferenceResponse> {
    const before = await this.getMessagingPreference(userId);
    // Repeating the same choice commits nothing and writes no second audit row.
    if (before.allowEmployerMessages === body.allowEmployerMessages) return before;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { allowEmployerMessages: body.allowEmployerMessages },
      select: { allowEmployerMessages: true },
    });
    await this.auditPublisher.record({
      actorId: userId,
      action: 'messaging_preference.updated',
      resourceType: 'user',
      resourceId: userId,
      reasonCode: null,
      metadata: {
        prior: { allowEmployerMessages: before.allowEmployerMessages },
        next: { allowEmployerMessages: updated.allowEmployerMessages },
      },
    });
    return { allowEmployerMessages: updated.allowEmployerMessages };
  }

  /** Idempotent: repeating the call keeps the original `deactivatedAt` and writes no second audit row. */
  async deactivate(
    userId: string,
    body: DeactivateAccountRequest,
  ): Promise<DeactivateAccountResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { deactivatedAt: true },
    });
    if (user.deactivatedAt) return { deactivatedAt: user.deactivatedAt.toISOString() };

    const deactivatedAt = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt, profileVisible: false, allowEmployerMessages: false },
    });
    await this.auth.revokeAllForUser(userId);
    await this.auditPublisher.record({
      actorId: userId,
      action: 'account.deactivated',
      resourceType: 'user',
      resourceId: userId,
      reasonCode: null,
      metadata: { reason: body.reason ?? null },
    });
    return { deactivatedAt: deactivatedAt.toISOString() };
  }

  async listDataRequests(userId: string): Promise<DataRequestListResponse> {
    const rows = await this.prisma.dataSubjectRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { requests: rows.map(toDataRequest) };
  }

  /** One open request per type: a repeat submission is rejected rather than duplicated. */
  async createDataRequest(userId: string, body: CreateDataRequest): Promise<DataRequestResponse> {
    const existing = await this.prisma.dataSubjectRequest.findFirst({
      where: { userId, type: body.type, status: { in: [...OPEN_STATUSES] } },
    });
    if (existing) {
      throw new ConflictException({
        error: 'data_request_already_open',
        message: `You already have an open ${body.type.toLowerCase()} request.`,
        statusCode: 409,
      });
    }
    if (body.type === 'EXPORT') await this.assertExportCooldown(userId);
    const row = await this.prisma.dataSubjectRequest.create({
      data: { userId, type: body.type, details: body.details },
    });
    // An export needs no reviewer; the job id makes a double enqueue a no-op.
    if (row.type === 'EXPORT') {
      await this.exportQueue?.add('build', { requestId: row.id }, { jobId: row.id });
    }
    await this.auditPublisher.record({
      actorId: userId,
      action: 'data_request.created',
      resourceType: 'data_subject_request',
      resourceId: row.id,
      reasonCode: null,
      metadata: { type: row.type },
    });
    return toDataRequest(row);
  }

  private async assertExportCooldown(userId: string): Promise<void> {
    const recent = await this.prisma.dataSubjectRequest.findFirst({
      where: {
        userId,
        type: 'EXPORT',
        status: 'COMPLETED',
        resolvedAt: { gte: new Date(Date.now() - EXPORT_COOLDOWN_MS) },
      },
    });
    if (recent) {
      throw new HttpException(
        {
          error: 'export_rate_limited',
          message: 'You can request one data export per day. Download your latest one instead.',
          statusCode: 429,
        },
        429,
      );
    }
  }
}
