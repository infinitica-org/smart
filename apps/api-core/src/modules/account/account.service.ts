import { ConflictException, Inject, Injectable } from '@nestjs/common';
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
import { AuthService } from '../auth/auth.service.js';

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

function toDataRequest(row: {
  id: string;
  type: 'CORRECTION' | 'DELETION';
  status: 'OPEN' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';
  details: string;
  createdAt: Date;
  resolvedAt: Date | null;
}): DataRequestResponse {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

/** STU-02 — student self-service: personal info, messaging switch, deactivation, DPDP requests. */
@Injectable()
export class AccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(AuthService) private readonly auth: AuthService,
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
    const row = await this.prisma.dataSubjectRequest.create({
      data: { userId, type: body.type, details: body.details },
    });
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
}
