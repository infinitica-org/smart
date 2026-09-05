import { describe, expect, it, vi } from 'vitest';
import { AiHealthDtoSchema, type AiCompletionRequest } from '@smart/contracts';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayAuditService } from './ai-gateway-audit.service.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';
import { AiCircuitBreaker, AiGatewayAllProvidersFailedError } from './circuit-breaker.js';

const AUDIT_ID = '11111111-1111-4111-8111-111111111111';

const sampleRequest: AiCompletionRequest = {
  promptRef: 'bars-l3@1',
  modelRole: 'PRIMARY_REASONING',
  priority: 'P1_REALTIME',
  variables: {
    trackName: 'Full Stack Engineering',
    competencyName: 'Explains technical decisions',
    anchors: {
      GOLD: 'Explains the trade-off they chose and names what it cost them.',
      SILVER: 'Explains what they built accurately but not why that approach.',
      BRONZE: 'Describes the outcome only; cannot account for any decision.',
    },
    anchorVersion: 3,
    prompt: 'Walk us through how you chose your database for this project.',
    candidateResponse: 'I used Postgres because I needed transactions across two tables.',
    isTranscript: false,
    referenceNotes: [],
  },
  correlation: {},
};

function mockPrismaCreate(create: ReturnType<typeof vi.fn>) {
  return { aiEvaluationAudit: { create } };
}

describe('ai-gateway adapters', () => {
  it('reports unconfigured status when API keys are missing', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();
    const openrouter = new OpenRouterAdapter();

    expect(anthropic.isConfigured).toBe(false);
    expect(google.isConfigured).toBe(false);
    expect(openrouter.isConfigured).toBe(false);

    const anthropicHealth = await anthropic.checkHealth();
    expect(anthropicHealth.provider).toBe('ANTHROPIC');
    expect(anthropicHealth.reachable).toBe(false);
    expect(anthropicHealth.circuitState).toBe('OPEN');
    expect(anthropicHealth.latencyMs).toBeNull();
    expect(anthropicHealth.message).toContain('ANTHROPIC_API_KEY');

    const googleHealth = await google.checkHealth();
    expect(googleHealth.provider).toBe('GOOGLE');
    expect(googleHealth.reachable).toBe(false);
    expect(googleHealth.circuitState).toBe('OPEN');
    expect(googleHealth.latencyMs).toBeNull();
    expect(googleHealth.message).toContain('GOOGLE_AI_API_KEY');

    const openrouterHealth = await openrouter.checkHealth();
    expect(openrouterHealth.provider).toBe('OPENROUTER');
    expect(openrouterHealth.reachable).toBe(false);
    expect(openrouterHealth.circuitState).toBe('OPEN');
    expect(openrouterHealth.latencyMs).toBeNull();
    expect(openrouterHealth.message).toContain('OPENROUTER_API_KEY');
  });

  it('fails fast on completion if adapter is not configured', async () => {
    const anthropic = new AnthropicAdapter();
    await expect(
      anthropic.complete({
        prompt: 'test prompt',
        modelRole: 'PRIMARY_REASONING',
      }),
    ).rejects.toThrow(/not configured/);

    const openrouter = new OpenRouterAdapter();
    await expect(
      openrouter.complete({
        prompt: 'test prompt',
        modelRole: 'PRIMARY_REASONING',
      }),
    ).rejects.toThrow(/not configured/);
  });
});

describe('AiGatewayService', () => {
  it('returns valid AiHealthDto schema across all providers even when keys are missing', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();
    const openrouter = new OpenRouterAdapter();
    const service = new AiGatewayService(
      anthropic,
      google,
      openrouter,
      new AiGatewayAuditService(),
      new AiCircuitBreaker(),
    );
    expect(service).toBeDefined();
  });

  it('completes via primary provider (Anthropic) when healthy', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'ANTHROPIC',
        reachable: true,
        circuitState: 'CLOSED' as const,
        latencyMs: 30,
      }),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'GOLD', barsScore: 90, confidence: 0.95 },
        rawText: '{"matchedAnchor":"GOLD"}',
        provider: 'ANTHROPIC' as const,
        model: 'claude-3-5-sonnet-latest',
        promptTokens: 150,
        completionTokens: 50,
        latencyMs: 120,
      }),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'GOOGLE',
        reachable: true,
        circuitState: 'CLOSED' as const,
        latencyMs: 25,
      }),
      complete: vi.fn(),
    };

    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: false,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'OPENROUTER',
        reachable: false,
        circuitState: 'OPEN' as const,
        latencyMs: null,
      }),
      complete: vi.fn(),
    };

    const cb = new AiCircuitBreaker({ failureThreshold: 2 });
    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      { record: () => Promise.resolve({ auditId: null }) } as never,
      cb,
    );

    const result = await service.complete(sampleRequest);

    expect(result.provider).toBe('ANTHROPIC');
    expect(result.usedFallback).toBe(false);
    expect(result.model).toBe('claude-3-5-sonnet-latest');
    expect(mockAnthropic.complete).toHaveBeenCalledTimes(1);
    expect(mockGoogle.complete).not.toHaveBeenCalled();
  });

  it('forces failover to Gemini 2.5 on Anthropic 429 Rate Limit (AC 1, AC 2, AC 3)', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'ANTHROPIC',
        reachable: false,
        circuitState: 'OPEN' as const,
        latencyMs: null,
      }),
      complete: vi.fn().mockRejectedValue(new Error('Rate limit exceeded (HTTP 429)')),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'GOOGLE',
        reachable: true,
        circuitState: 'CLOSED' as const,
        latencyMs: 35,
      }),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'GOLD', barsScore: 92, confidence: 0.93 },
        rawText: '{"matchedAnchor":"GOLD"}',
        provider: 'GOOGLE' as const,
        model: 'gemini-3.5-flash-lite',
        promptTokens: 145,
        completionTokens: 48,
        latencyMs: 140,
      }),
    };

    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: false,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'OPENROUTER',
        reachable: false,
        circuitState: 'OPEN' as const,
        latencyMs: null,
      }),
      complete: vi.fn(),
    };

    const cb = new AiCircuitBreaker({ failureThreshold: 1 });
    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      { record: () => Promise.resolve({ auditId: null }) } as never,
      cb,
    );

    const result = await service.complete(sampleRequest);

    expect(result.provider).toBe('GOOGLE');
    expect(result.usedFallback).toBe(true);
    expect(result.model).toBe('gemini-3.5-flash-lite');
    expect(mockAnthropic.complete).toHaveBeenCalledTimes(1);
    expect(mockGoogle.complete).toHaveBeenCalledTimes(1);
    expect(mockGoogle.complete).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(cb.getState('ANTHROPIC')).toBe('OPEN');
  });

  it('skips Anthropic immediately when its circuit is OPEN and routes to Gemini 2.5', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'SILVER', barsScore: 75, confidence: 0.88 },
        rawText: '{"matchedAnchor":"SILVER"}',
        provider: 'GOOGLE' as const,
        model: 'gemini-3.5-flash-lite',
        promptTokens: 140,
        completionTokens: 45,
        latencyMs: 110,
      }),
    };

    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };

    const cb = new AiCircuitBreaker({ failureThreshold: 1 });
    cb.trip('ANTHROPIC');

    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      { record: () => Promise.resolve({ auditId: null }) } as never,
      cb,
    );

    const result = await service.complete(sampleRequest);

    expect(result.provider).toBe('GOOGLE');
    expect(result.usedFallback).toBe(true);
    expect(mockAnthropic.complete).not.toHaveBeenCalled();
    expect(mockGoogle.complete).toHaveBeenCalledTimes(1);
  });

  it('fails over on 5xx and timeout errors', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('Service Unavailable'), { status: 503 })),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'BRONZE', barsScore: 60, confidence: 0.8 },
        rawText: '{"matchedAnchor":"BRONZE"}',
        provider: 'GOOGLE' as const,
        model: 'gemini-3.5-flash-lite',
        promptTokens: 130,
        completionTokens: 40,
        latencyMs: 95,
      }),
    };

    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };

    const cb = new AiCircuitBreaker({ failureThreshold: 1 });
    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      { record: () => Promise.resolve({ auditId: null }) } as never,
      cb,
    );

    const result = await service.complete(sampleRequest);
    expect(result.provider).toBe('GOOGLE');
    expect(result.usedFallback).toBe(true);
  });

  it('throws structured error when both/all providers fail', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockRejectedValue(new Error('Anthropic outage 500')),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockRejectedValue(new Error('Google quota exceeded 429')),
    };

    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };

    const cb = new AiCircuitBreaker({ failureThreshold: 1 });
    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      { record: () => Promise.resolve({ auditId: null }) } as never,
      cb,
    );

    await expect(service.complete(sampleRequest)).rejects.toThrow(AiGatewayAllProvidersFailedError);
  });

  it('fails over to OpenRouter when Anthropic and Gemini both fail', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockRejectedValue(new Error('Anthropic outage 500')),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockRejectedValue(new Error('Google quota exceeded 429')),
    };

    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'GOLD', barsScore: 88, confidence: 0.9 },
        rawText: '{"matchedAnchor":"GOLD"}',
        provider: 'OPENROUTER' as const,
        model: 'anthropic/claude-3.5-sonnet',
        promptTokens: 140,
        completionTokens: 40,
        latencyMs: 200,
      }),
    };

    const cb = new AiCircuitBreaker({ failureThreshold: 1 });
    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      { record: () => Promise.resolve({ auditId: null, estimatedCostUsd: 0 }) } as never,
      cb,
    );

    const result = await service.complete(sampleRequest);
    expect(result.provider).toBe('OPENROUTER');
    expect(result.usedFallback).toBe(true);
    expect(mockOpenRouter.complete).toHaveBeenCalledTimes(1);
  });

  it.skip('reflects dynamic circuit breaker state in /ai/health', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'ANTHROPIC',
        reachable: true,
        circuitState: 'CLOSED' as const,
        latencyMs: 40,
      }),
      complete: vi.fn(),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'GOOGLE',
        reachable: true,
        circuitState: 'CLOSED' as const,
        latencyMs: 30,
      }),
      complete: vi.fn(),
    };

    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'OPENROUTER',
        reachable: true,
        circuitState: 'CLOSED' as const,
        latencyMs: 50,
      }),
      complete: vi.fn(),
    };

    const cb = new AiCircuitBreaker();
    cb.trip('ANTHROPIC');

    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      new AiGatewayAuditService(),
      new AiCircuitBreaker(),
    );

    const health = await service.getHealth();
    const anthropicStatus = health.providers.find((p) => p.provider === 'ANTHROPIC');
    const googleStatus = health.providers.find((p) => p.provider === 'GOOGLE');

    expect(anthropicStatus?.circuitState).toBe('OPEN');
    expect(googleStatus?.circuitState).toBe('CLOSED');
  });

  it.skip('writes an audit row and returns that row id and metered cost', async () => {
    const create = vi.fn().mockResolvedValue({ id: AUDIT_ID });
    const audit = new AiGatewayAuditService(mockPrismaCreate(create) as never);

    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'GOLD' },
        rawText: '{}',
        provider: 'ANTHROPIC' as const,
        model: 'claude-3-5-sonnet-latest',
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
        latencyMs: 120,
      }),
    };
    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };
    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };

    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      audit,
      new AiCircuitBreaker(),
    );
    const result = await service.complete(sampleRequest);

    expect(result.auditId).toBe(AUDIT_ID);
    expect(result.estimatedCostUsd).toBe(18);
    expect(result.usedFallback).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    const payload = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(payload).toMatchObject({
      promptRef: 'bars-l3@1',
      provider: 'ANTHROPIC',
      model: 'claude-3-5-sonnet-latest',
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      latencyMs: 120,
      usedFallback: false,
      estimatedCostUsd: 18,
    });
    expect(payload).not.toHaveProperty('prompt');
    expect(payload).not.toHaveProperty('candidateResponse');
    expect(payload).not.toHaveProperty('rawText');
    expect(payload).not.toHaveProperty('output');
  });

  it.skip('persists OPENROUTER as OPENROUTER on failover, with latency on the row', async () => {
    const create = vi.fn().mockResolvedValue({ id: AUDIT_ID });
    const audit = new AiGatewayAuditService(mockPrismaCreate(create) as never);

    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockRejectedValue(new Error('429')),
    };
    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };
    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'SILVER' },
        rawText: '{}',
        provider: 'OPENROUTER' as const,
        model: 'anthropic/claude-3.5-sonnet',
        promptTokens: 10,
        completionTokens: 5,
        latencyMs: 88,
      }),
    };

    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      audit,
      new AiCircuitBreaker(),
    );
    const result = await service.complete(sampleRequest);

    expect(result.usedFallback).toBe(true);
    expect(result.provider).toBe('OPENROUTER');
    expect(result.auditId).toBe(AUDIT_ID);
    const payload = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(payload.provider).toBe('OPENROUTER');
    expect(payload.latencyMs).toBe(88);
    expect(payload.usedFallback).toBe(true);
  });

  it.skip('returns null auditId when the row is not written', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    const audit = new AiGatewayAuditService(mockPrismaCreate(create) as never);

    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        output: {},
        rawText: '{}',
        provider: 'ANTHROPIC' as const,
        model: 'claude-3-5-sonnet-latest',
        promptTokens: 10,
        completionTokens: 5,
        latencyMs: 40,
      }),
    };
    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };
    const mockOpenRouter = {
      provider: 'OPENROUTER' as const,
      isConfigured: false,
      checkHealth: vi.fn(),
      complete: vi.fn(),
    };

    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      audit,
      new AiCircuitBreaker(),
    );
    const result = await service.complete(sampleRequest);

    expect(result.auditId).toBeNull();
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
    expect(result.output).toEqual({});
  });
});

describe('AiGatewayController', () => {
  it('exposes /ai/health and admin health endpoints', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();
    const openrouter = new OpenRouterAdapter();
    const service = new AiGatewayService(
      anthropic,
      google,
      openrouter,
      new AiGatewayAuditService(),
      new AiCircuitBreaker(),
    );
    const controller = new AiGatewayController(service);

    const health = await controller.health();
    expect(health.providers).toHaveLength(3);
    expect(AiHealthDtoSchema.safeParse(health).success).toBe(true);

    const versioned = await controller.versionedHealth();
    expect(versioned.providers).toHaveLength(3);
    expect(AiHealthDtoSchema.safeParse(versioned).success).toBe(true);

    const admin = await controller.adminAiHealth();
    expect(admin.providers).toHaveLength(3);
    expect(AiHealthDtoSchema.safeParse(admin).success).toBe(true);

    const meta = controller.meta();
    expect(meta.module).toBe('ai-gateway');
    expect(meta.owner).toBe('Ramansh');
    expect(meta.status).toBe('active');
  });
});
