import {
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  InvitationDto,
  InvitationPreviewDto,
  InvitationStatus,
  UserRole,
} from '@smart/contracts';
import { SMART_TOPICS } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import type { EmailTemplateName } from '../../platform/mailer/mailer.types.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { hashPassword, type UserWithAuthIncludes } from '../auth/auth.service.js';
import {
  buildInviteUrl,
  generateInviteToken,
  hashInviteToken,
  invitationExpiresAt,
} from './invite-token.util.js';

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async preview(rawToken: string): Promise<InvitationPreviewDto> {
    const invitation = await this.requireValidInvitation(rawToken);
    return {
      fullName: invitation.fullName,
      email: invitation.email,
      role: invitation.role as InvitationPreviewDto['role'],
      institutionName: invitation.institution.name,
      batchName: invitation.batch?.name ?? null,
      expiresAt: invitation.expiresAt.toISOString(),
      status: invitation.status as InvitationStatus,
    };
  }

  async accept(rawToken: string, password: string): Promise<UserWithAuthIncludes> {
    const invitation = await this.requireValidInvitation(rawToken);
    if (invitation.status !== 'PENDING') {
      throw new GoneException({
        error: 'conflict',
        message: 'This invitation is no longer valid.',
        statusCode: 410,
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.update({
      where: { id: invitation.userId },
      data: {
        passwordHash,
        emailVerified: true,
        fullName: invitation.fullName,
        // Seed the onboarding draft with what we already know so a freshly
        // invited student never has to retype their own name — this is the
        // very first authenticated write for this account, so there is no
        // existing draft to merge with or clobber.
        ...(invitation.role === 'STUDENT'
          ? { onboardingDetails: onboardingSeedFromFullName(invitation.fullName) }
          : {}),
      },
      include: { institution: true, primaryTrack: true, secondaryTrack: true },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    return user;
  }

  async createAndEnqueue(params: {
    email: string;
    fullName: string;
    role: UserRole;
    institutionId: string;
    batchId?: string | null;
    groupLabel?: string | null;
    invitedById: string;
    sendEmail?: boolean;
  }): Promise<{ invitation: InvitationDto; rawToken: string }> {
    const email = params.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        error: 'conflict',
        message: 'A user with this email already exists.',
        statusCode: 409,
      });
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: params.institutionId },
    });
    if (!institution) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Institution not found.',
        statusCode: 404,
      });
    }

    const { raw, hash } = generateInviteToken();
    const expiresAt = invitationExpiresAt();

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: params.fullName,
        role: params.role as
          'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'PLACEMENT_STAFF' | 'STUDENT' | 'B2B_PARTNER',
        institutionId: params.institutionId,
        batchId: params.batchId ?? null,
        groupLabel: params.groupLabel ?? null,
        emailVerified: false,
        passwordHash: null,
      },
    });

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        fullName: params.fullName,
        role: params.role as
          'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'PLACEMENT_STAFF' | 'STUDENT' | 'B2B_PARTNER',
        institutionId: params.institutionId,
        batchId: params.batchId ?? null,
        groupLabel: params.groupLabel ?? null,
        userId: user.id,
        tokenHash: hash,
        status: 'PENDING',
        expiresAt,
        invitedById: params.invitedById,
      },
      include: { batch: true },
    });

    if (params.sendEmail !== false) {
      const template: EmailTemplateName =
        params.role === 'STUDENT' ? 'student-invite' : 'institution-admin-invite';
      await this.enqueueEmail(invitation, institution.name, raw, template);
    }

    return { invitation: toInvitationDto(invitation), rawToken: raw };
  }

  async resend(invitationId: string, actorInstitutionId: string | null): Promise<InvitationDto> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { institution: true, batch: true },
    });
    if (!invitation) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Invitation not found.',
        statusCode: 404,
      });
    }
    if (actorInstitutionId && invitation.institutionId !== actorInstitutionId) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Invitation not found.',
        statusCode: 404,
      });
    }
    if (invitation.status !== 'PENDING') {
      throw new ConflictException({
        error: 'conflict',
        message: 'Only pending invitations can be resent.',
        statusCode: 409,
      });
    }

    const { raw, hash } = generateInviteToken();
    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        tokenHash: hash,
        expiresAt: invitationExpiresAt(),
        lastSentAt: new Date(),
      },
      include: { batch: true },
    });

    const template: EmailTemplateName =
      invitation.role === 'STUDENT' ? 'student-invite' : 'institution-admin-invite';
    await this.enqueueEmail(updated, invitation.institution.name, raw, template);

    return toInvitationDto(updated);
  }

  /**
   * Mints a fresh invite URL for a TPO's "copy invite link" action — same
   * token rotation as `resend`, but no email is queued. The raw token only
   * ever exists in memory for the length of this call (only its hash is
   * persisted), so there is no way to hand back an existing link — every
   * call necessarily invalidates whatever link the student was sent before.
   */
  async mintLinkForUser(userId: string, institutionId: string): Promise<string> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { userId, institutionId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!invitation) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'This student has no pending invitation to link.',
        statusCode: 404,
      });
    }

    const { raw, hash } = generateInviteToken();
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { tokenHash: hash, expiresAt: invitationExpiresAt() },
    });
    return buildInviteUrl(raw);
  }

  async enqueueForBatch(batchId: string, institutionId: string): Promise<number> {
    const pending = await this.prisma.invitation.findMany({
      where: { batchId, institutionId, status: 'PENDING' },
      include: { institution: true, batch: true },
    });

    let enqueued = 0;
    for (const invitation of pending) {
      const { raw, hash } = generateInviteToken();
      const updated = await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { tokenHash: hash, expiresAt: invitationExpiresAt(), lastSentAt: new Date() },
        include: { batch: true },
      });
      await this.enqueueEmail(updated, invitation.institution.name, raw, 'student-invite');
      enqueued += 1;
    }
    return enqueued;
  }

  private async enqueueEmail(
    invitation: {
      id: string;
      email: string;
      fullName: string;
      userId: string;
      batch: { name: string } | null;
    },
    institutionName: string,
    rawToken: string,
    template: EmailTemplateName,
  ): Promise<void> {
    const inviteUrl = buildInviteUrl(rawToken);

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.invitationSent,
      partitionKey: invitation.id,
      eventType: SMART_TOPICS.invitationSent,
      source: 'invitations',
      data: {
        invitationId: invitation.id,
        userId: invitation.userId,
        email: invitation.email,
        fullName: invitation.fullName,
        institutionName,
        inviteUrl,
        template,
        batchName: invitation.batch?.name ?? null,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { lastSentAt: new Date() },
    });
  }

  private async findByTokenHash(hash: string) {
    return this.prisma.invitation.findUnique({
      where: { tokenHash: hash },
      include: { institution: true, batch: true },
    });
  }

  private async requireValidInvitation(rawToken: string) {
    const hash = hashInviteToken(rawToken);
    const invitation = await this.findByTokenHash(hash);
    if (!invitation) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Invitation not found.',
        statusCode: 404,
      });
    }
    if (invitation.status === 'REVOKED') {
      throw new GoneException({
        error: 'conflict',
        message: 'This invitation has been revoked.',
        statusCode: 410,
      });
    }
    if (invitation.status === 'ACCEPTED') {
      throw new ConflictException({
        error: 'conflict',
        message: 'This invitation has already been accepted.',
        statusCode: 409,
      });
    }
    if (invitation.expiresAt < new Date() || invitation.status === 'EXPIRED') {
      if (invitation.status === 'PENDING') {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new GoneException({
        error: 'conflict',
        message: 'This invitation has expired.',
        statusCode: 410,
      });
    }
    return invitation;
  }
}

export function toInvitationDto(invitation: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  batchId: string | null;
  groupLabel: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  lastSentAt: Date | null;
  createdAt: Date;
}): InvitationDto {
  return {
    invitationId: invitation.id,
    email: invitation.email,
    fullName: invitation.fullName,
    role: invitation.role as InvitationDto['role'],
    status: invitation.status as InvitationDto['status'],
    batchId: invitation.batchId,
    groupLabel: invitation.groupLabel,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    lastSentAt: invitation.lastSentAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}

/**
 * Seeds the CN-T01 onboarding draft from the one thing every invitation
 * already knows — the invitee's name — split on the first space. A
 * single-word name leaves `lastName` blank rather than guessing.
 */
function onboardingSeedFromFullName(fullName: string): Prisma.InputJsonValue {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(' ');
  const firstName = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
  const lastName = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();
  return { firstName, lastName, savedAt: new Date().toISOString() };
}
