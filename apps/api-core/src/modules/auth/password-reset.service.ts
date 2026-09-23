import { GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { env } from '../../platform/config/env.js';
import { EMAIL_QUEUE, type EmailJobPayload } from '../../platform/mailer/mailer.types.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuthService, hashPassword } from './auth.service.js';
import {
  buildPasswordResetUrl,
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
} from './password-reset-token.util.js';

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobPayload>,
  ) {}

  /**
   * Always resolves the same way whether or not the email matches an account —
   * revealing account existence via this endpoint is an enumeration vector.
   */
  async request(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      return;
    }

    const { raw, hash } = generatePasswordResetToken();
    const expiresAt = passwordResetExpiresAt();

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt },
    });

    await this.emailQueue.add('send', {
      to: user.email,
      template: 'password-reset',
      data: {
        fullName: user.fullName,
        resetUrl: buildPasswordResetUrl(raw),
        expiresAtFormatted: `${env.PASSWORD_RESET_TTL_HOURS} hours`,
      },
    });
  }

  async confirm(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashPasswordResetToken(rawToken);
    const token = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Reset link not found.',
        statusCode: 404,
      });
    }
    if (token.consumedAt) {
      throw new GoneException({
        error: 'conflict',
        message: 'This reset link has already been used.',
        statusCode: 410,
      });
    }
    if (token.expiresAt < new Date()) {
      throw new GoneException({
        error: 'conflict',
        message: 'This reset link has expired.',
        statusCode: 410,
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    await this.auth.revokeAllForUser(token.userId);
  }
}
