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
import type { AiProviderAdapter } from './ai-gateway.interface.js';
import { AiCircuitBreaker, AiGatewayAllProvidersFailedError } from './circuit-breaker.js';

@Injectable()
export class AiGatewayService {
  readonly owner = 'Ramansh';
  readonly purpose = 'The only module allowed to import an LLM SDK.';
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    @Inject(AnthropicAdapter) private readonly anthropic: AnthropicAdapter,
    @Inject(GoogleAdapter) private readonly google: GoogleAdapter,
    @Inject(OpenRouterAdapter) private readonly openrouter: OpenRouterAdapter,
    @Inject(AiCircuitBreaker) private readonly circuitBreaker: AiCircuitBreaker,
    @Inject(AiGatewayAuditService) private readonly auditService: AiGatewayAuditService,
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

  getCircuitBreaker(): AiCircuitBreaker {
    return this.circuitBreaker;
  }

  async getHealth(): Promise<AiHealthDto> {
    const [anthropicHealth, googleHealth, openrouterHealth] = await Promise.all([
      this.anthropic.checkHealth(),
      this.google.checkHealth(),
      this.openrouter.checkHealth(),
    ]);

    const resolveCircuitState = (
      provider: AiProvider,
      probeState: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    ): 'CLOSED' | 'OPEN' | 'HALF_OPEN' => {
      const cbState = this.circuitBreaker.getState(provider);
      return cbState !== 'CLOSED' ? cbState : probeState;
    };

    const resetDate = new Date(Date.now() + 60_000).toISOString();

    return {
      providers: [
        {
          provider: 'ANTHROPIC',
          reachable: anthropicHealth.reachable,
          circuitState: resolveCircuitState('ANTHROPIC', anthropicHealth.circuitState),
          latencyMs: anthropicHealth.latencyMs,
        },
        {
          provider: 'GOOGLE',
          reachable: googleHealth.reachable,
          circuitState: resolveCircuitState('GOOGLE', googleHealth.circuitState),
          latencyMs: googleHealth.latencyMs,
        },
        {
          provider: 'OPENROUTER',
          reachable: openrouterHealth.reachable,
          circuitState: resolveCircuitState('OPENROUTER', openrouterHealth.circuitState),
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

    const candidateAdapters: Array<{ provider: AiProvider; adapter: AiProviderAdapter }> = [
      { provider: 'ANTHROPIC', adapter: this.anthropic },
      { provider: 'GOOGLE', adapter: this.google },
      { provider: 'OPENROUTER', adapter: this.openrouter },
    ];

    const configured = candidateAdapters.filter((c) => c.adapter.isConfigured);
    const candidates = configured.length > 0 ? configured : candidateAdapters;

    const attemptedErrors: Array<{
      provider: AiProvider;
      message: string;
      circuitState: string;
    }> = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!candidate) continue;

      const isFallback = candidate.provider !== 'ANTHROPIC';

      if (!this.circuitBreaker.isCallAllowed(candidate.provider)) {
        const state = this.circuitBreaker.getState(candidate.provider);
        this.logger.warn(
          `Circuit breaker is ${state} for ${candidate.provider}. Skipping to next fallback.`,
        );
        attemptedErrors.push({
          provider: candidate.provider,
          message: `Circuit breaker is ${state}`,
          circuitState: state,
        });
        continue;
      }

      try {
        const result = await this.circuitBreaker.execute(candidate.provider, (signal) =>
          candidate.adapter.complete({
            system: rendered.system,
            prompt: rendered.user,
            modelRole: request.modelRole,
            temperature: request.temperature,
            maxTokens: request.maxOutputTokens,
            outputSchema: rendered.outputSchema,
            signal,
          }),
        );

        const { auditId, estimatedCostUsd } = await this.auditService.recordAudit({
          promptRef: request.promptRef,
          provider: result.provider,
          model: result.model,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          usedFallback: isFallback,
          responseId: request.correlation?.responseId,
          latencyMs: result.latencyMs,
        });

        return {
          output: result.output,
          provider: result.provider,
          model: result.model,
          usedFallback: isFallback,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          latencyMs: result.latencyMs,
          estimatedCostUsd,
          auditId,
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const circuitState = this.circuitBreaker.getState(candidate.provider);
        attemptedErrors.push({
          provider: candidate.provider,
          message: errMsg,
          circuitState,
        });
        this.logger.warn(
          `Provider ${candidate.provider} failed: ${errMsg} (circuitState: ${circuitState}). Trying next fallback if available.`,
        );
      }
    }

    throw new AiGatewayAllProvidersFailedError(attemptedErrors);
  }
}
