import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CredentialVerifiedEventSchema,
  SMART_TOPICS,
  type EvidenceVerificationMethod,
  type VectorizedSignal,
} from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CorroborationService } from '../corroboration/corroboration.service.js';
import type { CertificateVerificationTier } from './credential-trust.js';
import { RuleBasedEncoder } from './rule-based.encoder.js';

export function tierFromEvents(
  events: readonly { metadata: unknown }[],
): CertificateVerificationTier | null {
  for (const event of events) {
    const metadata = event.metadata;
    if (metadata && typeof metadata === 'object' && 'tier' in metadata) {
      const tier = (metadata as { tier?: unknown }).tier;
      if (
        tier === 'TIER_1_ISSUER_API' ||
        tier === 'TIER_2_PUBLIC_URL' ||
        tier === 'TIER_3_OCR_HEURISTIC'
      ) {
        return tier;
      }
    }
  }
  return null;
}

/**
 * Reacts to smart.credential.verified: encodes the now-verified
 * CandidateCertificate/ProfessionalCredential and feeds it into corroboration
 * fusion as an EXTERNALCERT/PROFESSIONALCREDENTIAL passive signal (S6-VV-74).
 *
 * Owner: Ramansh.
 */
@Injectable()
export class CredentialVerifiedFusionConsumer implements OnModuleInit {
  private readonly logger = new Logger(CredentialVerifiedFusionConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RuleBasedEncoder) private readonly encoder: RuleBasedEncoder,
    @Inject(CorroborationService) private readonly corroboration: CorroborationService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.credentialVerified,
        module: 'signal-encoder',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = CredentialVerifiedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed smart.credential.verified payload');
              return;
            }

            const { userId, sourceId, entityId } = parsed.data.data;
            const vector =
              sourceId === 'EXTERNALCERT'
                ? await this.encodeCertificate(userId, entityId)
                : await this.encodeCredential(userId, entityId);

            if (!vector || vector.entries.length === 0) return;
            await this.corroboration.ingestPassiveSignal(vector);
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `credential-verified fusion consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async encodeCertificate(
    userId: string,
    certificateId: string,
  ): Promise<VectorizedSignal | null> {
    const cert = await this.prisma.candidateCertificate.findUnique({
      where: { id: certificateId },
      include: {
        skills: true,
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    // Re-checked against current status rather than trusting the event alone —
    // a later action (e.g. void) may have superseded the verification by now.
    if (!cert || cert.status !== 'VERIFIED') return null;

    return this.encoder.encodeCandidateCertificate({
      userId,
      skills: cert.skills.map((skill) => ({
        skillCode: skill.skillCode,
        selfAssessedProficiency: skill.selfAssessedProficiency,
      })),
      verificationTier: tierFromEvents(cert.events),
      encodedAt: new Date().toISOString(),
    });
  }

  private async encodeCredential(
    userId: string,
    credentialId: string,
  ): Promise<VectorizedSignal | null> {
    const credential = await this.prisma.professionalCredential.findUnique({
      where: { id: credentialId },
    });
    if (!credential || credential.status !== 'ACTIVE') return null;

    return this.encoder.encodeProfessionalCredential({
      userId,
      coveredSkillCodes: credential.coveredSkillCodes,
      verificationMethod:
        (credential.verificationMethod as EvidenceVerificationMethod | null) ?? null,
      encodedAt: new Date().toISOString(),
    });
  }
}
