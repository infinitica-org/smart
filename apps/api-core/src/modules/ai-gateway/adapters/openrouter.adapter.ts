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
  PRIMARY_REASONING: 'anthropic/claude-3.5-sonnet',
  FAST_EXTRACTION: 'anthropic/claude-3.5-haiku',
  FALLBACK_REASONING: 'google/gemini-2.5-pro',
  FALLBACK_FAST: 'google/gemini-2.5-flash',
  EMBEDDING: 'openai/text-embedding-3-small',
};

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

@Injectable()
export class OpenRouterAdapter implements AiProviderAdapter {
  readonly provider: AiProvider = 'OPENROUTER';
  private readonly apiKey: string | null;

  constructor() {
    const key = env.OPENROUTER_API_KEY?.trim();
    this.apiKey = key || null;
  }

  get isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async checkHealth(): Promise<ProviderHealthResult> {
    if (!this.apiKey) {
      return {
        provider: this.provider,
        reachable: false,
        circuitState: 'OPEN',
        latencyMs: null,
        message: 'OPENROUTER_API_KEY is not configured',
      };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/auth/key`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - start;
      if (!response.ok) {
        return {
          provider: this.provider,
          reachable: false,
          circuitState: 'OPEN',
          latencyMs,
          message: `OpenRouter probe returned status ${String(response.status)}`,
        };
      }

      return {
        provider: this.provider,
        reachable: true,
        circuitState: 'CLOSED',
        latencyMs,
      };
    } catch (err) {
      return {
        provider: this.provider,
        reachable: false,
        circuitState: 'OPEN',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'OpenRouter probe failed',
      };
    }
  }

  async complete(options: ModelCompletionOptions): Promise<ModelCompletionResult> {
    if (!this.apiKey) {
      throw new Error('OpenRouter client is not configured (missing OPENROUTER_API_KEY).');
    }

    const model = ROLE_TO_MODEL[options.modelRole] ?? 'anthropic/claude-3.5-sonnet';
    const start = Date.now();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    messages.push({ role: 'user', content: options.prompt });

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://smart.infinitica.io',
        'X-Title': 'SMART Platform',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0,
        max_tokens: options.maxTokens ?? 2048,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const latencyMs = Date.now() - start;
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenRouter API error (${String(response.status)}): ${errText}`);
    }

    const data = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const rawText = data.choices?.[0]?.message?.content ?? '';

    let output: unknown = rawText;
    if (options.outputSchema) {
      try {
        const parsed = JSON.parse(rawText);
        output = options.outputSchema.parse(parsed);
      } catch (parseErr) {
        throw new Error(
          `OpenRouter output schema validation failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        );
      }
    }

    return {
      output,
      rawText,
      provider: this.provider,
      model: data.model ?? model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      latencyMs,
    };
  }
}
