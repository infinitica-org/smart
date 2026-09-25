import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  ToggleModelVersionRequestSchema,
  type AiCompletionRequest,
  type AiCompletionResponse,
  type AiHealthDto,
  type AiProvider,
} from '@smart/contracts';
import { listPrompts, renderPromptRef } from '@smart/prompts';
import { LOG_EVENTS, logEvent } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayAuditService } from './ai-gateway-audit.service.js';
import { AiGatewayUsageService } from './ai-gateway-usage.service.js';
import type { AiProviderAdapter, ModelCompletionResult } from './ai-gateway.interface.js';
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
    @Inject(AiGatewayAuditService) private readonly audit: AiGatewayAuditService,
    @Inject(AiCircuitBreaker) private readonly circuitBreaker: AiCircuitBreaker,
    // Optional (and left off every pre-existing test's constructor call) so
    // getHealth() degrades to monthlySpendUsd: 0 instead of failing when a
    // caller doesn't wire it up, e.g. a unit test built before this field
    // existed. Real callers get it for free via ai-gateway.module.ts DI.
    @Optional()
    @Inject(AiGatewayUsageService)
    private readonly usage?: AiGatewayUsageService,
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

  /** Fast local check — no network probe — for skipping synchronous LLM work. */
  hasCallableProvider(): boolean {
    const entries: Array<{ provider: AiProvider; ready: boolean }> = [
      { provider: 'ANTHROPIC', ready: this.anthropic.isConfigured },
      { provider: 'GOOGLE', ready: this.google.isConfigured },
      { provider: 'OPENROUTER', ready: this.openrouter.isConfigured },
    ];
    const configured = entries.map((entry) => ({
      provider: entry.provider,
      ready: entry.ready && this.circuitBreaker.isCallAllowed(entry.provider),
    }));

    const primary = env.AI_PRIMARY_PROVIDER;
    const ordered = primary
      ? [
          ...configured.filter((entry) => entry.provider === primary),
          ...configured.filter((entry) => entry.provider !== primary),
        ]
      : configured;
    return ordered.some((entry) => entry.ready);
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

    // Real spend, aggregated from `ai_evaluation_audits` (see
    // AiGatewayUsageService). `usage` is only unset in tests built before
    // that service existed; production DI always provides it.
    const monthlySpendUsd = this.usage
      ? (await this.usage.getUsageSummary()).last30d.totalCostUsd
      : 0;

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
      // tokenBucket/queueDepth remain placeholders: they describe *live*
      // rate-limiter and queue state, not historical completions, and
      // nothing in the codebase currently instruments either one (see
      // PR description). `ai_evaluation_audits` — the table this method now
      // reads for monthlySpendUsd — has no queue or in-flight-request data
      // to derive them from without new instrumentation, which is out of
      // scope here.
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
      monthlySpendUsd,
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

    const allProviders: Array<{ provider: AiProvider; adapter: AiProviderAdapter }> = [
      { provider: 'ANTHROPIC', adapter: this.anthropic },
      { provider: 'GOOGLE', adapter: this.google },
      { provider: 'OPENROUTER', adapter: this.openrouter },
    ];

    const primaryProvider = env.AI_PRIMARY_PROVIDER;
    const primary = primaryProvider
      ? allProviders.find((p) => p.provider === primaryProvider)
      : undefined;
    const chain = primary
      ? [primary, ...allProviders.filter((p) => p.provider !== primaryProvider)]
      : allProviders;

    const timeoutMs = Math.max(
      45_000,
      request.maxOutputTokens ? Math.ceil((request.maxOutputTokens / 80) * 1000) : 45_000,
    );

    for (const { provider, adapter } of chain) {
      if (!adapter.isConfigured) continue;

      const targetModel =
        provider === 'ANTHROPIC'
          ? request.modelRole === 'FAST_EXTRACTION' ||
            request.modelRole === 'FALLBACK_FAST' ||
            request.modelRole === 'EMBEDDING'
            ? 'claude-3-5-haiku-latest'
            : 'claude-3-5-sonnet-latest'
          : provider === 'GOOGLE'
            ? request.modelRole === 'EMBEDDING'
              ? 'text-embedding-004'
              : 'gemini-3.5-flash-lite'
            : env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

      if (this.circuitBreaker.isModelDisabled(provider, targetModel)) {
        this.logger.warn(
          `Model ${targetModel} on provider ${provider} is disabled. Trying next provider.`,
        );
        attemptedErrors.push({
          provider,
          message: `Model ${targetModel} on ${provider} is administratively disabled`,
          circuitState: this.circuitBreaker.getState(provider),
        });
        continue;
      }

      if (!this.circuitBreaker.isCallAllowed(provider)) {
        const state = this.circuitBreaker.getState(provider);
        attemptedErrors.push({
          provider,
          message: `Circuit breaker is ${state}`,
          circuitState: state,
        });
        this.logger.warn(`Circuit breaker is ${state} for ${provider}. Trying next provider.`);
        continue;
      }

      try {
        const result = await this.circuitBreaker.execute(
          provider,
          (signal) =>
            adapter.complete({
              system: rendered.system,
              prompt: rendered.user,
              modelRole: request.modelRole,
              temperature: request.temperature,
              maxTokens: request.maxOutputTokens,
              outputSchema: rendered.outputSchema,
              signal,
            }),
          timeoutMs,
        );
        const primary = chain[0]?.provider ?? 'ANTHROPIC';
        const response = await this.toCompletionResponse(request, result, provider !== primary);
        this.logger.log(
          `ai.complete ${request.promptRef} model=${response.model} in=${String(response.promptTokens)} out=${String(response.completionTokens)} ${String(response.latencyMs)}ms ~$${response.estimatedCostUsd.toFixed(6)}`,
        );
        return response;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const circuitState = this.circuitBreaker.getState(provider);
        attemptedErrors.push({ provider, message: errMsg, circuitState });
        logEvent(
          this.logger,
          'warn',
          LOG_EVENTS.AI_PROVIDER_FAILED,
          { provider, err: errMsg, circuitState },
          'AI provider failed; trying next fallback if available',
        );
      }
    }

    throw new AiGatewayAllProvidersFailedError(attemptedErrors);
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
      estimatedCostUsd: recorded.estimatedCostUsd ?? 0,
      auditId: recorded.auditId,
    };
  }

  async listRegisteredPrompts() {
    const prompts = listPrompts().map((p) => ({
      promptRef: p.promptRef,
      purpose: p.purpose,
      modelRole: p.modelRole,
      temperature: p.temperature,
      status: 'ACTIVE' as const,
    }));
    return { prompts, total: prompts.length };
  }

  async listAuditLogs() {
    if (this.usage) {
      return this.usage.listAuditLogs();
    }
    return { logs: [], total: 0 };
  }

  async toggleModelVersion(body: unknown) {
    const payload = ToggleModelVersionRequestSchema.parse(body);
    if (!payload.active) {
      this.circuitBreaker.disableModel(payload.provider, payload.model);
      this.logger.warn(
        `Targeted model version disable: ${payload.model} on ${payload.provider} disabled. Reason: ${payload.reason}`,
      );
    } else {
      this.circuitBreaker.enableModel(payload.provider, payload.model);
      this.logger.log(
        `Targeted model version enable: ${payload.model} on ${payload.provider} enabled.`,
      );
    }
    return {
      model: payload.model,
      provider: payload.provider,
      active: payload.active,
      updatedAt: new Date().toISOString(),
    };
  }
}
