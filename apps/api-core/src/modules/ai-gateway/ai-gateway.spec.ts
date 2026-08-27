import { describe, expect, it, vi } from 'vitest';
import { AiHealthDtoSchema, type AiCompletionRequest } from '@smart/contracts';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayAuditService } from './ai-gateway-audit.service.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';

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
    );

    const health = await service.getHealth();
    const validation = AiHealthDtoSchema.safeParse(health);

    expect(validation.success).toBe(true);
    expect(health.providers).toHaveLength(3);
    expect(health.providers.map((p) => p.provider)).toEqual(['ANTHROPIC', 'GOOGLE', 'OPENROUTER']);
    expect(health.providers[0]?.reachable).toBe(false);
    expect(health.providers[1]?.reachable).toBe(false);
    expect(health.providers[2]?.reachable).toBe(false);
    expect(health.tokenBucket.requestsRemaining).toBe(200);
    expect(health.queueDepth.P1_REALTIME).toBe(0);
    expect(health.automatedScoringPaused).toBe(false);
  });

  it('aggregates provider health and reachability correctly', async () => {
    const mockAnthropic = {
      provider: 'ANTHROPIC' as const,
      isConfigured: true,
      checkHealth: vi.fn().mockResolvedValue({
        provider: 'ANTHROPIC',
        reachable: true,
        circuitState: 'CLOSED' as const,
        latencyMs: 42,
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
        latencyMs: 38,
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
        latencyMs: 55,
      }),
      complete: vi.fn(),
    };

    const service = new AiGatewayService(
      mockAnthropic as never,
      mockGoogle as never,
      mockOpenRouter as never,
      new AiGatewayAuditService(),
    );
    const health = await service.getHealth();

    expect(health.providers[0]).toEqual({
      provider: 'ANTHROPIC',
      reachable: true,
      circuitState: 'CLOSED',
      latencyMs: 42,
    });
    expect(health.providers[1]).toEqual({
      provider: 'GOOGLE',
      reachable: true,
      circuitState: 'CLOSED',
      latencyMs: 38,
    });
    expect(health.providers[2]).toEqual({
      provider: 'OPENROUTER',
      reachable: true,
      circuitState: 'CLOSED',
      latencyMs: 55,
    });
  });

  it('writes an audit row and returns that row id and metered cost', async () => {
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

  it('persists OPENROUTER as OPENROUTER on failover, with latency on the row', async () => {
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

  it('returns null auditId when the row is not written', async () => {
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
    );
    const controller = new AiGatewayController(service);

    const health = await controller.health();
    expect(health.providers).toHaveLength(3);

    const versioned = await controller.versionedHealth();
    expect(versioned.providers).toHaveLength(3);

    const admin = await controller.adminAiHealth();
    expect(admin.providers).toHaveLength(3);

    const meta = controller.meta();
    expect(meta.module).toBe('ai-gateway');
    expect(meta.owner).toBe('Ramansh');
    expect(meta.status).toBe('active');
  });
});
