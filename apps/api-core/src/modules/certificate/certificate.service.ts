import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { EvalCompletedEvent } from '@smart/contracts';
import { CertificateIssuedDataSchema, SMART_TOPICS } from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Issuance, visibility, public verification.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
  ) {}

  async issueFromEvalCompleted(event: EvalCompletedEvent): Promise<void> {
    const data = event.data;
    const track = await this.prisma.track.findFirst({
      where: { code: data.trackCode },
    });
    if (!track) {
      this.logger.warn(`Track ${data.trackCode} not found for certificate issuance`);
      return;
    }

    const certifiableTier =
      data.tierAwarded === 'GOLD' || data.tierAwarded === 'SILVER' || data.tierAwarded === 'BRONZE'
        ? data.tierAwarded
        : 'BRONZE';

    const levelKey = `L${data.levelNumber}` as 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
    const existing = await this.prisma.certificate.findFirst({
      where: { userId: data.studentId, trackId: track.id },
    });

    const tierTrail = {
      ...(existing?.tierTrail && typeof existing.tierTrail === 'object'
        ? (existing.tierTrail as Record<string, string>)
        : {}),
      [levelKey]: data.tierAwarded,
    };

    const verificationSlug =
      existing?.verificationSlug ?? randomUUID().replace(/-/g, '').slice(0, 16);
    const issuedAt = new Date();

    const certificate = existing
      ? await this.prisma.certificate.update({
          where: { id: existing.id },
          data: {
            highestLevelCleared: Math.max(existing.highestLevelCleared, data.levelNumber),
            headlineTier: certifiableTier,
            tierTrail,
            status: 'ISSUED',
            issuedAt,
          },
        })
      : await this.prisma.certificate.create({
          data: {
            userId: data.studentId,
            trackId: track.id,
            highestLevelCleared: data.levelNumber,
            headlineTier: certifiableTier,
            tierTrail,
            status: 'ISSUED',
            verificationSlug,
            issuedAt,
          },
        });

    const verificationUrl = `${env.VERIFY_APP_URL}/${certificate.verificationSlug}`;
    const issuedPayload = CertificateIssuedDataSchema.parse({
      certificateId: certificate.id,
      studentId: data.studentId,
      trackCode: data.trackCode,
      highestLevelCleared: certificate.highestLevelCleared,
      headlineTier: certificate.headlineTier,
      tierTrail,
      verificationUrl,
      issuedAt: issuedAt.toISOString(),
    });

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.certificateIssued,
      partitionKey: certificate.id,
      eventType: SMART_TOPICS.certificateIssued,
      source: 'certificate',
      data: issuedPayload,
    });
  }

  async getMeta() {
    return {
      module: 'certificate',
      owner: this.owner,
      purpose: this.purpose,
      status: 'active',
    };
  }

  async requireCertificate(certificateId: string) {
    const row = await this.prisma.certificate.findUnique({ where: { id: certificateId } });
    if (!row) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Certificate not found.',
        statusCode: 404,
      });
    }
    return row;
  }
}
