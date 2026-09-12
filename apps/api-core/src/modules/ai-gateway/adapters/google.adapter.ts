import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import type { AiModelRole, AiProvider } from '@smart/contracts';
import { env } from '../../../platform/config/env.js';
import type {
  AiProviderAdapter,
  ModelCompletionOptions,
  ModelCompletionResult,
  ProviderHealthResult,
} from '../ai-gateway.interface.js';
import { coerceGoogleStructuredOutput } from './google.output-coerce.js';
import { coerceLlmJson } from './llm-json-coerce.js';
import { parseJsonSafely, stripJsonNulls } from './openrouter.helpers.js';

const ROLE_TO_MODEL: Record<AiModelRole, string> = {
  PRIMARY_REASONING: 'gemini-3.5-flash-lite',
  FAST_EXTRACTION: 'gemini-3.5-flash-lite',
  FALLBACK_REASONING: 'gemini-3.5-flash-lite',
  FALLBACK_FAST: 'gemini-3.5-flash-lite',
  EMBEDDING: 'text-embedding-004',
};

@Injectable()
export class GoogleAdapter implements AiProviderAdapter {
  readonly provider: AiProvider = 'GOOGLE';
  private readonly client: GoogleGenAI | null;

  constructor() {
    const key = env.GOOGLE_AI_API_KEY?.trim();
    this.client = key && !key.startsWith('#') ? new GoogleGenAI({ apiKey: key }) : null;
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
        message: 'GOOGLE_AI_API_KEY is not configured',
      };
    }

    const start = Date.now();
    try {
      // Lightweight probe
      await this.client.models.list({ config: { pageSize: 1 } });
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
        message: err instanceof Error ? err.message : 'Google GenAI probe failed',
      };
    }
  }

  async complete(options: ModelCompletionOptions): Promise<ModelCompletionResult> {
    if (!this.client) {
      throw new Error('Google GenAI client is not configured (missing GOOGLE_AI_API_KEY).');
    }

    const model = ROLE_TO_MODEL[options.modelRole] ?? 'gemini-3.5-flash-lite';
    const start = Date.now();

    const response = await this.client.models.generateContent({
      model,
      contents: options.prompt,
      config: {
        systemInstruction: options.system,
        temperature: options.temperature ?? 0,
        maxOutputTokens: options.maxTokens ?? 2048,
        abortSignal: options.signal,
      },
    });

    const latencyMs = Date.now() - start;
    const rawText = response.text ?? '';

    let output: unknown = rawText;
    if (options.outputSchema) {
      try {
        const parsed = coerceLlmJson(
          coerceGoogleStructuredOutput(stripJsonNulls(parseJsonSafely(rawText))),
        );
        output = options.outputSchema.parse(parsed);
      } catch (parseErr) {
        throw new Error(
          `Google output schema validation failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        );
      }
    }

    const usage = response.usageMetadata;
    return {
      output,
      rawText,
      provider: this.provider,
      model,
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs,
    };
  }
}
