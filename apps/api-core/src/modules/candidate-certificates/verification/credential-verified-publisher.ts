import { SMART_TOPICS, type CredentialVerifiedEvent } from '@smart/contracts';
import type { KafkaOutboxService } from '../../../platform/kafka/kafka-outbox.service.js';

/**
 * Shared publish helper for smart.credential.verified (S6-VV-74).
 *
 * Emitted from every place a CandidateCertificate or ProfessionalCredential
 * reaches a verified state (endorsement decision, admin override, agenda
 * assessment pass, or automated issuer/URL verification) so signal-encoder
 * can vectorize it into corroboration fusion without each caller knowing
 * anything about that downstream pipeline.
 *
 * Owner: Ramansh.
 */
export async function publishCredentialVerified(
  outbox: KafkaOutboxService,
  source: string,
  data: CredentialVerifiedEvent['data'],
): Promise<void> {
  await outbox.enqueueEnvelope({
    topic: SMART_TOPICS.credentialVerified,
    partitionKey: data.userId,
    eventType: SMART_TOPICS.credentialVerified,
    source,
    data,
  });
}
