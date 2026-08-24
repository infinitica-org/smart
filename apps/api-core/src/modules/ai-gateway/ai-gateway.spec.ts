import { describe, expect, it, vi } from 'vitest';
import { AiHealthDtoSchema } from '@smart/contracts';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GoogleAdapter } from './adapters/google.adapter.js';
import { AiGatewayController } from './ai-gateway.controller.js';
import { AiGatewayService } from './ai-gateway.service.js';

describe('ai-gateway adapters', () => {
  it('reports unconfigured status when API keys are missing', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();

    expect(anthropic.isConfigured).toBe(false);
    expect(google.isConfigured).toBe(false);

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
  });

  it('fails fast on completion if adapter is not configured', async () => {
    const anthropic = new AnthropicAdapter();
    await expect(
      anthropic.complete({
        prompt: 'test prompt',
        modelRole: 'PRIMARY_REASONING',
      }),
    ).rejects.toThrow(/not configured/);
  });
});

describe('AiGatewayService', () => {
  it('returns valid AiHealthDto schema even when keys are missing', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();
    const service = new AiGatewayService(anthropic, google);

    const health = await service.getHealth();
    const validation = AiHealthDtoSchema.safeParse(health);

    expect(validation.success).toBe(true);
    expect(health.providers).toHaveLength(2);
    expect(health.providers.map((p) => p.provider)).toEqual(['ANTHROPIC', 'GOOGLE']);
    expect(health.providers[0]?.reachable).toBe(false);
    expect(health.providers[1]?.reachable).toBe(false);
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

    const service = new AiGatewayService(mockAnthropic as never, mockGoogle as never);
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
  });
});

describe('AiGatewayController', () => {
  it('exposes /ai/health and admin health endpoints', async () => {
    const anthropic = new AnthropicAdapter();
    const google = new GoogleAdapter();
    const service = new AiGatewayService(anthropic, google);
    const controller = new AiGatewayController(service);

    const health = await controller.health();
    expect(health.providers).toHaveLength(2);

    const versioned = await controller.versionedHealth();
    expect(versioned.providers).toHaveLength(2);

    const admin = await controller.adminAiHealth();
    expect(admin.providers).toHaveLength(2);

    const meta = controller.meta();
    expect(meta.module).toBe('ai-gateway');
    expect(meta.owner).toBe('Ramansh');
    expect(meta.status).toBe('active');
  });
});
