import { GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { env } from '../../platform/config/env.js';
import { EMAIL_QUEUE, type EmailJobPayload } from '../../platform/mailer/mailer.types.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  buildEmailVerificationUrl,
  emailVerificationExpiresAt,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from './email-verification-token.util.js';

/** One verification email per account per minute, whatever the caller's IP. */
const RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobPayload>,
  ) {}

  async sendForUser(userId: string, email: string, fullName: string): Promise<void> {
    const { raw, hash } = generateEmailVerificationToken();
    const expiresAt = emailVerificationExpiresAt();

    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hash, expiresAt },
    });

    await this.emailQueue.add('send', {
      to: email,
      template: 'email-verification',
      data: {
        fullName,
        verifyUrl: buildEmailVerificationUrl(raw),
        expiresAtFormatted: `${env.EMAIL_VERIFICATION_TTL_HOURS} hours`,
      },
    });
  }

  /**
   * Sends a fresh link to an unverified, self-registered account and retires the old ones. Silent
   * for unknown, already-verified or just-emailed addresses, so the caller can always answer 204.
   */
  async resend(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Invited users with no password yet verify by accepting the invite, not by this link.
    if (!user?.passwordHash || user.emailVerified) return;

    const latest = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) return;

    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id, consumedAt: null },
    });
    await this.sendForUser(user.id, user.email, user.fullName);
  }

  async confirm(rawToken: string): Promise<void> {
    const tokenHash = hashEmailVerificationToken(rawToken);
    const token = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!token) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Verification link not found.',
        statusCode: 404,
      });
    }
    if (token.consumedAt) {
      throw new GoneException({
        error: 'conflict',
        message: 'This verification link has already been used.',
        statusCode: 410,
      });
    }
    if (token.expiresAt < new Date()) {
      throw new GoneException({
        error: 'conflict',
        message: 'This verification link has expired.',
        statusCode: 410,
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: token.userId }, data: { emailVerified: true } }),
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() },
      }),
    ]);
  }
}
