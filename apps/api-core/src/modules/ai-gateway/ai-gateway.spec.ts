import { describe, expect, it, vi } from 'vitest';
import { AiHealthDtoSchema, type AiCompletionRequest } from '@smart/contracts';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayAuditService } from './ai-gateway-audit.service.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';
import { AiCircuitBreaker, AiGatewayAllProvidersFailedError } from './circuit-breaker.js';

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

describe('AiGatewayAuditService', () => {
  it('calculates cost accurately across Claude and Gemini models', () => {
    const auditService = new AiGatewayAuditService();

    const sonnetCost = auditService.calculateCostUsd('claude-3-5-sonnet-latest', 10_000, 2_000);
    expect(sonnetCost).toBe(0.06);

    const haikuCost = auditService.calculateCostUsd('claude-3-5-haiku-latest', 10_000, 1_000);
    expect(haikuCost).toBe(0.012);

    const geminiProCost = auditService.calculateCostUsd('gemini-2.5-pro', 20_000, 4_000);
    expect(geminiProCost).toBe(0.045);

    const geminiFlashCost = auditService.calculateCostUsd('gemini-2.5-flash', 100_000, 10_000);
    expect(geminiFlashCost).toBe(0.0105);

    expect(auditService.calculateCostUsd('claude-3-5-sonnet-latest', 0, 0)).toBe(0);
    expect(auditService.calculateCostUsd('claude-3-5-sonnet-latest', -100, -50)).toBe(0);
  });

  it('persists audit row to Prisma with all expected fields and no PII', async () => {
    const mockPrisma = {
      aiEvaluationAudit: {
        create: vi.fn().mockResolvedValue({ id: 'mock-audit-uuid' }),
      },
    };

    const auditService = new AiGatewayAuditService(mockPrisma as never);

    const result = await auditService.recordAudit({
      promptRef: 'bars-l3@1',
      provider: 'ANTHROPIC',
      model: 'claude-3-5-sonnet-latest',
      promptTokens: 1500,
      completionTokens: 300,
      usedFallback: false,
      responseId: '11111111-2222-3333-4444-555555555555',
      latencyMs: 250,
    });

    expect(result.auditId).toBeDefined();
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
    expect(mockPrisma.aiEvaluationAudit.create).toHaveBeenCalledTimes(1);

    const createCallArg = mockPrisma.aiEvaluationAudit.create.mock.calls[0]?.[0];
    expect(createCallArg.data).toMatchObject({
      promptRef: 'bars-l3@1',
      provider: 'ANTHROPIC',
      model: 'claude-3-5-sonnet-latest',
      promptTokens: 1500,
      completionTokens: 300,
      usedFallback: false,
      responseId: '11111111-2222-3333-4444-555555555555',
      estimatedCostUsd: result.estimatedCostUsd,
    });

    expect(createCallArg.data.prompt).toBeUndefined();
    expect(createCallArg.data.candidateResponse).toBeUndefined();
    expect(createCallArg.data.email).toBeUndefined();
    expect(createCallArg.data.userId).toBeUndefined();
  });

  it('handles database write failure gracefully and logs error without crashing', async () => {
    const mockPrisma = {
      aiEvaluationAudit: {
        create: vi.fn().mockRejectedValue(new Error('PostgreSQL connection timeout')),
      },
    };

    const auditService = new AiGatewayAuditService(mockPrisma as never);

    const result = await auditService.recordAudit({
      promptRef: 'bars-l3@1',
      provider: 'ANTHROPIC',
      model: 'claude-3-5-sonnet-latest',
      promptTokens: 500,
      completionTokens: 100,
      usedFallback: false,
    });

    expect(result.auditId).toBeDefined();
    expect(result.estimatedCostUsd).toBeGreaterThan(0);
    expect(mockPrisma.aiEvaluationAudit.create).toHaveBeenCalledTimes(1);
  });
});

describe('AiGatewayService Failover & Circuit Breaker', () => {
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
    maxOutputTokens: 1024,
    temperature: 0,
  };

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
        model: 'gemini-2.5-pro',
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
      cb,
    );

    const result = await service.complete(sampleRequest);

    expect(result.provider).toBe('GOOGLE');
    expect(result.usedFallback).toBe(true);
    expect(result.model).toBe('gemini-2.5-pro');
    expect(mockAnthropic.complete).toHaveBeenCalledTimes(1);
    expect(mockGoogle.complete).toHaveBeenCalledTimes(1);
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
        model: 'gemini-2.5-pro',
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
      complete: vi.fn().mockRejectedValue(new Error('503 Service Unavailable')),
    };

    const mockGoogle = {
      provider: 'GOOGLE' as const,
      isConfigured: true,
      checkHealth: vi.fn(),
      complete: vi.fn().mockResolvedValue({
        output: { matchedAnchor: 'BRONZE', barsScore: 60, confidence: 0.8 },
        rawText: '{"matchedAnchor":"BRONZE"}',
        provider: 'GOOGLE' as const,
        model: 'gemini-2.5-pro',
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
      cb,
    );

    await expect(service.complete(sampleRequest)).rejects.toThrow(AiGatewayAllProvidersFailedError);
  });

  it('reflects dynamic circuit breaker state in /ai/health', async () => {
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
      cb,
    );

    const health = await service.getHealth();
    const anthropicStatus = health.providers.find((p) => p.provider === 'ANTHROPIC');
    const googleStatus = health.providers.find((p) => p.provider === 'GOOGLE');

    expect(anthropicStatus?.circuitState).toBe('OPEN');
    expect(googleStatus?.circuitState).toBe('CLOSED');
  });
});

describe('AiGatewayController', () => {
  it('exposes /ai/health and admin health endpoints', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();
    const openrouter = new OpenRouterAdapter();
    const cb = new AiCircuitBreaker();
    const service = new AiGatewayService(anthropic, google, openrouter, cb);
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
