import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import type { AiModelRole, AiProvider } from '@smart/contracts';
import { env } from '../../../platform/config/env.js';
import type {
  AiProviderAdapter,
  ModelCompletionOptions,
  ModelCompletionResult,
  ProviderHealthResult,
} from '../ai-gateway.interface.js';

const ROLE_TO_MODEL: Record<AiModelRole, string> = {
  PRIMARY_REASONING: 'claude-3-5-sonnet-latest',
  FAST_EXTRACTION: 'claude-3-5-haiku-latest',
  FALLBACK_REASONING: 'claude-3-5-sonnet-latest',
  FALLBACK_FAST: 'claude-3-5-haiku-latest',
  EMBEDDING: 'claude-3-5-haiku-latest',
};

@Injectable()
export class AnthropicAdapter implements AiProviderAdapter {
  readonly provider: AiProvider = 'ANTHROPIC';
  private readonly client: Anthropic | null;

  constructor() {
    const key = env.ANTHROPIC_API_KEY?.trim();
    this.client = key && !key.startsWith('#') ? new Anthropic({ apiKey: key }) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async checkHealth(): Promise<ProviderHealthResult> {
    if (!this.client) {
      return {
        provider: this.provider,
        reachable: false,
        circuitState: 'OPEN',
        latencyMs: null,
        message: 'ANTHROPIC_API_KEY is not configured',
      };
    }

    const start = Date.now();
    try {
      // Lightweight probe
      await this.client.models.list({ limit: 1 });
      return {
        provider: this.provider,
        reachable: true,
        circuitState: 'CLOSED',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        provider: this.provider,
        reachable: false,
        circuitState: 'OPEN',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Anthropic probe failed',
      };
    }
  }

  async complete(options: ModelCompletionOptions): Promise<ModelCompletionResult> {
    if (!this.client) {
      throw new Error('Anthropic client is not configured (missing ANTHROPIC_API_KEY).');
    }

    const model = ROLE_TO_MODEL[options.modelRole] ?? 'claude-3-5-sonnet-latest';
    const start = Date.now();

    const response = await this.client.messages.create(
      {
        model,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0,
        system: options.system,
        messages: [{ role: 'user', content: options.prompt }],
      },
      { signal: options.signal },
    );

    const latencyMs = Date.now() - start;
    const firstBlock = response.content[0];
    const rawText = firstBlock?.type === 'text' ? firstBlock.text : '';

    let output: unknown = rawText;
    if (options.outputSchema) {
      try {
        const parsed = JSON.parse(rawText);
        output = options.outputSchema.parse(parsed);
      } catch (parseErr) {
        throw new Error(
          `Anthropic output schema validation failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        );
      }
    }

    return {
      output,
      rawText,
      provider: this.provider,
      model: response.model,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      latencyMs,
    };
  }
}
