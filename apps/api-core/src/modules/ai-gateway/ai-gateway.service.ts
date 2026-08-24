import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiHealthDto,
  AiProvider,
} from '@smart/contracts';
import { renderPromptRef } from '@smart/prompts';
import { env } from '../../platform/config/env.js';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import type { AiProviderAdapter } from './ai-gateway.interface.js';

@Injectable()
export class AiGatewayService {
  readonly owner = 'Ramansh';
  readonly purpose = 'The only module allowed to import an LLM SDK.';
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    @Inject(AnthropicAdapter) private readonly anthropic: AnthropicAdapter,
    @Inject(GoogleAdapter) private readonly google: GoogleAdapter,
  ) {}

  getAdapter(provider: AiProvider): AiProviderAdapter {
    return provider === 'ANTHROPIC' ? this.anthropic : this.google;
  }

  async getHealth(): Promise<AiHealthDto> {
    const [anthropicHealth, googleHealth] = await Promise.all([
      this.anthropic.checkHealth(),
      this.google.checkHealth(),
    ]);

    const resetDate = new Date(Date.now() + 60_000).toISOString();

    return {
      providers: [
        {
          provider: 'ANTHROPIC',
          reachable: anthropicHealth.reachable,
          circuitState: anthropicHealth.circuitState,
          latencyMs: anthropicHealth.latencyMs,
        },
        {
          provider: 'GOOGLE',
          reachable: googleHealth.reachable,
          circuitState: googleHealth.circuitState,
          latencyMs: googleHealth.latencyMs,
        },
      ],
      tokenBucket: {
        requestsRemaining: 200,
        tokensRemaining: 10_000,
        windowResetsAt: resetDate,
      },
      queueDepth: {
        P1_REALTIME: 0,
        P2_ASYNC_EVAL: 0,
        P3_BATCH: 0,
      },
      automatedScoringPaused: false,
      pauseReason: null,
      monthlySpendUsd: 0,
      monthlyCeilingUsd: env.AI_MONTHLY_CEILING_USD,
    };
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const rendered = renderPromptRef(request.promptRef, request.variables);

    let usedFallback = false;
    let adapter: AiProviderAdapter = this.anthropic;

    if (!this.anthropic.isConfigured && this.google.isConfigured) {
      usedFallback = true;
      adapter = this.google;
    }

    try {
      const result = await adapter.complete({
        system: rendered.system,
        prompt: rendered.user,
        modelRole: request.modelRole,
        temperature: request.temperature,
        maxTokens: request.maxOutputTokens,
        outputSchema: rendered.outputSchema,
      });

      return {
        output: result.output,
        provider: result.provider,
        model: result.model,
        usedFallback,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: result.latencyMs,
        estimatedCostUsd: 0,
        auditId: randomUUID(),
      };
    } catch (primaryErr) {
      if (!usedFallback && this.google.isConfigured) {
        this.logger.warn(
          `Primary provider Anthropic failed, falling back to Google: ${primaryErr instanceof Error ? primaryErr.message : String(primaryErr)}`,
        );
        const result = await this.google.complete({
          system: rendered.system,
          prompt: rendered.user,
          modelRole: request.modelRole,
          temperature: request.temperature,
          maxTokens: request.maxOutputTokens,
          outputSchema: rendered.outputSchema,
        });

        return {
          output: result.output,
          provider: result.provider,
          model: result.model,
          usedFallback: true,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          latencyMs: result.latencyMs,
          estimatedCostUsd: 0,
          auditId: randomUUID(),
        };
      }
      throw primaryErr;
    }
  }
}
