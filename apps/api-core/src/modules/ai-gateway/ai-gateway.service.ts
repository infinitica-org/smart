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
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayAuditService } from './ai-gateway-audit.service.js';
import type { AiProviderAdapter, ModelCompletionResult } from './ai-gateway.interface.js';

@Injectable()
export class AiGatewayService {
  readonly owner = 'Ramansh';
  readonly purpose = 'The only module allowed to import an LLM SDK.';
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    @Inject(AnthropicAdapter) private readonly anthropic: AnthropicAdapter,
    @Inject(GoogleAdapter) private readonly google: GoogleAdapter,
    @Inject(OpenRouterAdapter) private readonly openrouter: OpenRouterAdapter,
    @Inject(AiGatewayAuditService) private readonly audit: AiGatewayAuditService,
  ) {}

  getAdapter(provider: AiProvider): AiProviderAdapter {
    switch (provider) {
      case 'ANTHROPIC':
        return this.anthropic;
      case 'GOOGLE':
        return this.google;
      case 'OPENROUTER':
        return this.openrouter;
    }
  }

  async getHealth(): Promise<AiHealthDto> {
    const [anthropicHealth, googleHealth, openrouterHealth] = await Promise.all([
      this.anthropic.checkHealth(),
      this.google.checkHealth(),
      this.openrouter.checkHealth(),
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
        {
          provider: 'OPENROUTER',
          reachable: openrouterHealth.reachable,
          circuitState: openrouterHealth.circuitState,
          latencyMs: openrouterHealth.latencyMs,
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

    const candidates: Array<{ provider: AiProvider; adapter: AiProviderAdapter }> = [];

    if (this.anthropic.isConfigured) {
      candidates.push({ provider: 'ANTHROPIC', adapter: this.anthropic });
    }
    if (this.google.isConfigured) {
      candidates.push({ provider: 'GOOGLE', adapter: this.google });
    }
    if (this.openrouter.isConfigured) {
      candidates.push({ provider: 'OPENROUTER', adapter: this.openrouter });
    }

    if (candidates.length === 0) {
      candidates.push({ provider: 'ANTHROPIC', adapter: this.anthropic });
    }

    let lastError: unknown;
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!candidate) continue;
      const isFallback = i > 0;

      try {
        const result = await candidate.adapter.complete({
          system: rendered.system,
          prompt: rendered.user,
          modelRole: request.modelRole,
          temperature: request.temperature,
          maxTokens: request.maxOutputTokens,
          outputSchema: rendered.outputSchema,
        });

        return this.toCompletionResponse(request, result, isFallback);
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `Provider ${candidate.provider} failed: ${err instanceof Error ? err.message : String(err)}. Trying next fallback if available.`,
        );
      }
    }

    throw lastError;
  }

  private async toCompletionResponse(
    request: AiCompletionRequest,
    result: ModelCompletionResult,
    usedFallback: boolean,
  ): Promise<AiCompletionResponse> {
    const recorded = await this.audit.record({
      promptRef: request.promptRef,
      provider: result.provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
      usedFallback,
      responseId: request.correlation.responseId,
    });

    return {
      output: result.output,
      provider: result.provider,
      model: result.model,
      usedFallback,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
      estimatedCostUsd: recorded.estimatedCostUsd,
      auditId: recorded.auditId,
    };
  }
}
