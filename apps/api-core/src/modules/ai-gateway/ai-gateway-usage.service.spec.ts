import { describe, expect, it, vi } from 'vitest';
import { AiUsageSummaryDtoSchema } from '@smart/contracts';
import { AiGatewayUsageService } from './ai-gateway-usage.service.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function row(overrides: {
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENROUTER';
  latencyMs: number;
  usedFallback: boolean;
  estimatedCostUsd: number;
  createdAt: Date;
}) {
  return overrides;
}

function makeService(rows: ReturnType<typeof row>[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const service = new AiGatewayUsageService({
    aiEvaluationAudit: { findMany },
  } as never);
  return { service, findMany };
}

describe('AiGatewayUsageService', () => {
  it('returns zeroed windows and a schema-valid DTO when there are no rows', async () => {
    const { service } = makeService([]);
    const summary = await service.getUsageSummary();

    expect(AiUsageSummaryDtoSchema.safeParse(summary).success).toBe(true);
    expect(summary.last24h.requestCount).toBe(0);
    expect(summary.last24h.totalCostUsd).toBe(0);
    expect(summary.last24h.fallbackRate).toBe(0);
    expect(summary.last30d.requestCount).toBe(0);
    expect(summary.errorRateAvailable).toBe(false);
    expect(summary.last24h.byProvider).toHaveLength(3);
  });

  it('queries a 30-day window and computes cost, latency and fallback aggregates', async () => {
    const now = Date.now();
    const rows = [
      row({
        provider: 'ANTHROPIC',
        latencyMs: 100,
        usedFallback: false,
        estimatedCostUsd: 0.01,
        createdAt: new Date(now - 1 * HOUR_MS),
      }),
      row({
        provider: 'ANTHROPIC',
        latencyMs: 200,
        usedFallback: true,
        estimatedCostUsd: 0.02,
        createdAt: new Date(now - 2 * HOUR_MS),
      }),
      row({
        provider: 'GOOGLE',
        latencyMs: 50,
        usedFallback: false,
        estimatedCostUsd: 0.005,
        createdAt: new Date(now - 3 * HOUR_MS),
      }),
      // Outside the 24h window but inside 30d.
      row({
        provider: 'OPENROUTER',
        latencyMs: 500,
        usedFallback: true,
        estimatedCostUsd: 0.5,
        createdAt: new Date(now - 5 * DAY_MS),
      }),
    ];
    const { service, findMany } = makeService(rows);

    const summary = await service.getUsageSummary();

    // 30d window queried once; 24h is derived in-memory from it.
    expect(findMany).toHaveBeenCalledTimes(1);
    const call = findMany.mock.calls[0]?.[0] as { where: { createdAt: { gte: Date } } };
    expect(now - call.where.createdAt.gte.getTime()).toBeCloseTo(30 * DAY_MS, -3);

    expect(summary.last24h.requestCount).toBe(3);
    expect(summary.last24h.totalCostUsd).toBeCloseTo(0.035, 6);
    expect(summary.last24h.fallbackRate).toBeCloseTo(1 / 3, 4);
    expect(summary.last24h.avgLatencyMs).toBe(Math.round((100 + 200 + 50) / 3));

    expect(summary.last30d.requestCount).toBe(4);
    expect(summary.last30d.totalCostUsd).toBeCloseTo(0.535, 6);
    expect(summary.last30d.fallbackRate).toBe(0.5);

    const anthropic = summary.last24h.byProvider.find((p) => p.provider === 'ANTHROPIC');
    expect(anthropic?.requestCount).toBe(2);
    expect(anthropic?.fallbackRate).toBe(0.5);
    expect(anthropic?.totalCostUsd).toBeCloseTo(0.03, 6);

    const openrouter24h = summary.last24h.byProvider.find((p) => p.provider === 'OPENROUTER');
    expect(openrouter24h?.requestCount).toBe(0);
    const openrouter30d = summary.last30d.byProvider.find((p) => p.provider === 'OPENROUTER');
    expect(openrouter30d?.requestCount).toBe(1);
  });

  it('computes a nearest-rank p95 latency', async () => {
    const now = Date.now();
    const latencies = Array.from({ length: 20 }, (_, i) => (i + 1) * 10); // 10..200
    const rows = latencies.map((latencyMs, i) =>
      row({
        provider: 'GOOGLE',
        latencyMs,
        usedFallback: false,
        estimatedCostUsd: 0.001,
        createdAt: new Date(now - i * 60_000),
      }),
    );
    const { service } = makeService(rows);

    const summary = await service.getUsageSummary();
    // Nearest-rank p95 of 20 sorted values [10..200] is the 19th value = 190.
    expect(summary.last24h.p95LatencyMs).toBe(190);
  });
});
