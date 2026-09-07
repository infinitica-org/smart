import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AiCompletionRecordedDataSchema, SMART_TOPICS, type AiProvider } from '@smart/contracts';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';

export interface ModelPricing {
  readonly promptPerMillion: number;
  readonly completionPerMillion: number;
}

const DEFAULT_PRICING: ModelPricing = { promptPerMillion: 1.0, completionPerMillion: 3.0 };

export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-latest': { promptPerMillion: 3.0, completionPerMillion: 15.0 },
  'claude-3-5-haiku-latest': { promptPerMillion: 0.8, completionPerMillion: 4.0 },
  'gemini-3.5-flash-lite': { promptPerMillion: 0.15, completionPerMillion: 0.6 },
  'anthropic/claude-3.5-sonnet': { promptPerMillion: 3.0, completionPerMillion: 15.0 },
  'anthropic/claude-3.5-haiku': { promptPerMillion: 0.8, completionPerMillion: 4.0 },
  'google/gemini-3.5-flash-lite': { promptPerMillion: 0.15, completionPerMillion: 0.6 },
  'google/gemini-2.5-flash': { promptPerMillion: 0.3, completionPerMillion: 2.5 },
  'google/gemini-2.0-flash-001': { promptPerMillion: 0.1, completionPerMillion: 0.4 },
};

/** OpenRouter may suffix `:provider`; unknown models use default $1/$3 per 1M. */
export function lookupModelPricing(model: string): ModelPricing {
  const slug = model.split(':')[0]?.trim() || model;
  const exact = MODEL_PRICING_TABLE[slug] ?? MODEL_PRICING_TABLE[model];
  if (exact) return exact;
  for (const [key, pricing] of Object.entries(MODEL_PRICING_TABLE)) {
    if (slug.startsWith(key) || key.startsWith(slug)) return pricing;
  }
  return DEFAULT_PRICING;
}

export interface AuditRecordInput {
  readonly promptRef: string;
  readonly provider: AiProvider;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly latencyMs: number;
  readonly usedFallback: boolean;
  readonly responseId?: string;
}

export interface AuditRecordResult {
  readonly auditId: string | null;
  readonly estimatedCostUsd: number;
}

@Injectable()
export class AiGatewayAuditService {
  private readonly logger = new Logger(AiGatewayAuditService.name);

  constructor(
    @Optional() @Inject(KafkaOutboxService) private readonly outbox?: KafkaOutboxService,
  ) {}

  estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = lookupModelPricing(model);
    const raw =
      (promptTokens / 1_000_000) * pricing.promptPerMillion +
      (completionTokens / 1_000_000) * pricing.completionPerMillion;
    return Number(raw.toFixed(6));
  }

  async record(input: AuditRecordInput): Promise<AuditRecordResult> {
    const estimatedCostUsd = this.estimateCostUsd(
      input.model,
      input.promptTokens,
      input.completionTokens,
    );

    if (!this.outbox) {
      this.logger.warn('Kafka outbox unavailable; skipping ai.completion.recorded publish.');
      return { auditId: null, estimatedCostUsd };
    }

    try {
      const data = AiCompletionRecordedDataSchema.parse({
        promptRef: input.promptRef,
        provider: input.provider,
        model: input.model,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        latencyMs: input.latencyMs,
        usedFallback: input.usedFallback,
        estimatedCostUsd,
        responseId: input.responseId ?? null,
        recordedAt: new Date().toISOString(),
      });
      await this.outbox.enqueueEnvelope({
        topic: SMART_TOPICS.aiCompletionRecorded,
        partitionKey: input.responseId ?? input.promptRef,
        eventType: SMART_TOPICS.aiCompletionRecorded,
        source: 'ai-gateway',
        data,
      });
    } catch (err) {
      this.logger.warn(
        `Audit publish failed; completion still returned. ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { auditId: null, estimatedCostUsd };
  }
}
