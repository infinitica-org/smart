import { describe, expect, it, vi } from 'vitest';
import { AiHealthDtoSchema } from '@smart/contracts';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter.adapter.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';

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
    const service = new AiGatewayService(anthropic, google, openrouter);

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
});

describe('AiGatewayController', () => {
  it('exposes /ai/health and admin health endpoints', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();
    const openrouter = new OpenRouterAdapter();
    const service = new AiGatewayService(anthropic, google, openrouter);
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
