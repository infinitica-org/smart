import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type {
  ProfileVisibilityResponse,
  ReserveUsernameRequest,
  UpdateProfileVisibilityRequest,
  UsernameStatusResponse,
} from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

/** CN-T09 rate-limit guard on the reservation endpoint itself (separate from the global rate limiter). */
const MAX_FAILED_ATTEMPTS_BEFORE_COOLDOWN = 5;
const COOLDOWN_MINUTES = 15;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

@Injectable()
export class UsernameService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  async getStatus(userId: string): Promise<UsernameStatusResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        username: true,
        usernameStatus: true,
        usernameReservedAt: true,
        usernameActivatedAt: true,
      },
    });
    return {
      username: user.username,
      status: user.usernameStatus,
      reservedAt: user.usernameReservedAt?.toISOString() ?? null,
      activatedAt: user.usernameActivatedAt?.toISOString() ?? null,
    };
  }

  async reserve(userId: string, body: ReserveUsernameRequest): Promise<UsernameStatusResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { username: true, usernameCooldownUntil: true, usernameFailedAttempts: true },
    });

    // A username is a one-time claim, not an editable field — once set (reserved or
    // active), it's permanent. This is enforced here, not just hidden in the UI, so a
    // direct API call can't bypass the "locked" state the profile page shows.
    if (user.username) {
      throw new ConflictException({
        error: 'username_already_claimed',
        message: 'You already have a username and it cannot be changed.',
        statusCode: 409,
      });
    }

    const now = new Date();
    if (user.usernameCooldownUntil && user.usernameCooldownUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (user.usernameCooldownUntil.getTime() - now.getTime()) / 1000,
      );
      // CN-T09 — the cooldown is enforced, but the *reason* (how many attempts, or that a
      // cooldown even exists as a concept) is never surfaced beyond this standard 429 shape.
      throw new HttpException(
        {
          error: 'rate_limit_exceeded',
          message: `Too many attempts. Please wait ${String(retryAfterSeconds)} seconds before retrying.`,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const normalized = normalizeUsername(body.username);

    const blocked = await this.isBlocked(normalized);
    if (blocked) {
      await this.registerFailedAttempt(userId, user.usernameFailedAttempts);
      throw new BadRequestException({
        error: 'username_blocked',
        message: 'That username is not allowed.',
        statusCode: 400,
      });
    }

    const existing = await this.prisma.user.findUnique({
      where: { usernameNormalized: normalized },
      select: { id: true },
    });
    if (existing && existing.id !== userId) {
      await this.registerFailedAttempt(userId, user.usernameFailedAttempts);
      throw new ConflictException({
        error: 'username_taken',
        message: 'That username is already taken.',
        statusCode: 409,
      });
    }

    // A fresh reservation (including re-reserving a different name) always starts RESERVED —
    // "Reservation ≠ activation": activation only happens when the profile goes visible.
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: body.username.trim(),
        usernameNormalized: normalized,
        usernameStatus: 'RESERVED',
        usernameReservedAt: now,
        usernameActivatedAt: null,
        usernameFailedAttempts: 0,
        usernameCooldownUntil: null,
      },
    });

    await this.auditPublisher.record({
      actorId: userId,
      action: 'username.reserved',
      resourceType: 'user',
      resourceId: userId,
      reasonCode: null,
    });

    return {
      username: updated.username,
      status: updated.usernameStatus,
      reservedAt: updated.usernameReservedAt?.toISOString() ?? null,
      activatedAt: updated.usernameActivatedAt?.toISOString() ?? null,
    };
  }

  async getVisibility(userId: string): Promise<ProfileVisibilityResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { profileVisible: true, showInProgressItems: true },
    });
    return {
      profileVisible: user.profileVisible,
      showInProgressItems: user.showInProgressItems,
    };
  }

  async updateVisibility(
    userId: string,
    body: UpdateProfileVisibilityRequest,
  ): Promise<ProfileVisibilityResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { usernameStatus: true, profileVisible: true },
    });

    // Turning visibility on for the first time is exactly the "activation" moment for a
    // previously-reserved-only username; going back off never de-activates it.
    const activating =
      body.profileVisible && !user.profileVisible && user.usernameStatus === 'RESERVED';

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profileVisible: body.profileVisible,
        ...(body.showInProgressItems !== undefined
          ? { showInProgressItems: body.showInProgressItems }
          : {}),
        ...(activating ? { usernameStatus: 'ACTIVE', usernameActivatedAt: new Date() } : {}),
      },
    });

    await this.auditPublisher.record({
      actorId: userId,
      action: 'profile_visibility.updated',
      resourceType: 'user',
      resourceId: userId,
      reasonCode: null,
      metadata: {
        profileVisible: updated.profileVisible,
        showInProgressItems: updated.showInProgressItems,
      },
    });

    return {
      profileVisible: updated.profileVisible,
      showInProgressItems: updated.showInProgressItems,
    };
  }

  private async isBlocked(normalizedUsername: string): Promise<boolean> {
    // The blocklist is expected to stay small (super-admin curated), so an in-memory
    // containment scan is simpler and fast enough; revisit if this table grows large.
    const blockedWords = await this.prisma.blockedWord.findMany({ select: { word: true } });
    return blockedWords.some((entry) => normalizedUsername.includes(entry.word));
  }

  private async registerFailedAttempt(
    userId: string,
    currentFailedAttempts: number,
  ): Promise<void> {
    const nextFailedAttempts = currentFailedAttempts + 1;
    const shouldCooldown = nextFailedAttempts >= MAX_FAILED_ATTEMPTS_BEFORE_COOLDOWN;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        usernameFailedAttempts: shouldCooldown ? 0 : nextFailedAttempts,
        ...(shouldCooldown
          ? { usernameCooldownUntil: new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000) }
          : {}),
      },
    });
  }
}
