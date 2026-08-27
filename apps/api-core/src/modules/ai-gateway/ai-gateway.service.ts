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
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
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

    const attemptedErrors: Array<{
      provider: AiProvider;
      message: string;
      circuitState: string;
    }> = [];

    // Attempt ANTHROPIC (Primary)
    if (this.anthropic.isConfigured && this.circuitBreaker.isCallAllowed('ANTHROPIC')) {
      try {
        const result = await this.circuitBreaker.execute('ANTHROPIC', (signal) =>
          this.anthropic.complete({
            system: rendered.system,
            prompt: rendered.user,
            modelRole: request.modelRole,
            temperature: request.temperature,
            maxTokens: request.maxOutputTokens,
            outputSchema: rendered.outputSchema,
            signal,
          }),
        );
        return {
          output: result.output,
          provider: result.provider,
          model: result.model,
          usedFallback: false,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          latencyMs: result.latencyMs,
          estimatedCostUsd: 0,
          auditId: randomUUID(),
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const circuitState = this.circuitBreaker.getState('ANTHROPIC');
        attemptedErrors.push({
          provider: 'ANTHROPIC',
          message: errMsg,
          circuitState,
        });
        this.logger.warn(
          `Primary provider ANTHROPIC failed: ${errMsg} (circuitState: ${circuitState}). Failing over to GOOGLE.`,
        );
      }
    } else if (this.anthropic.isConfigured) {
      const state = this.circuitBreaker.getState('ANTHROPIC');
      attemptedErrors.push({
        provider: 'ANTHROPIC',
        message: `Circuit breaker is ${state}`,
        circuitState: state,
      });
      this.logger.warn(`Circuit breaker is ${state} for ANTHROPIC. Failing over to GOOGLE.`);
    }

    // Attempt GOOGLE (Fallback)
    if (this.google.isConfigured && this.circuitBreaker.isCallAllowed('GOOGLE')) {
      try {
        const result = await this.circuitBreaker.execute('GOOGLE', (signal) =>
          this.google.complete({
            system: rendered.system,
            prompt: rendered.user,
            modelRole: request.modelRole,
            temperature: request.temperature,
            maxTokens: request.maxOutputTokens,
            outputSchema: rendered.outputSchema,
            signal,
          }),
        );
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
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const circuitState = this.circuitBreaker.getState('GOOGLE');
        attemptedErrors.push({
          provider: 'GOOGLE',
          message: errMsg,
          circuitState,
        });
        this.logger.warn(
          `Fallback provider GOOGLE failed: ${errMsg} (circuitState: ${circuitState}).`,
        );
      }
    } else if (this.google.isConfigured) {
      const state = this.circuitBreaker.getState('GOOGLE');
      attemptedErrors.push({
        provider: 'GOOGLE',
        message: `Circuit breaker is ${state}`,
        circuitState: state,
      });
      this.logger.warn(`Circuit breaker is ${state} for GOOGLE.`);
    }

    throw new AiGatewayAllProvidersFailedError(attemptedErrors);
  }
}
