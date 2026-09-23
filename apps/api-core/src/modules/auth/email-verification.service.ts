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
