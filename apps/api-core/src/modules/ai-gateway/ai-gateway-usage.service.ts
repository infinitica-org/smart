import { Inject, Injectable } from '@nestjs/common';
import type {
  AiProvider,
  AiUsageSummaryDto,
  AiUsageWindow,
  ListAiAuditLogsResponse,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const ALL_PROVIDERS: readonly AiProvider[] = ['ANTHROPIC', 'GOOGLE', 'OPENROUTER'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prisma returns `estimatedCostUsd` as a `Decimal`; duck-type rather than import generated internals. */
type Decimalish = { toNumber?: () => number } | number | string;

function num(value: Decimalish): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber?.() ?? Number(value);
}

interface UsageRow {
  provider: AiProvider;
  latencyMs: number;
  usedFallback: boolean;
  estimatedCostUsd: Decimalish;
  createdAt: Date;
}

/** Nearest-rank percentile — fine for admin-dashboard-scale sample sizes. */
function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.min(sortedAsc.length, Math.max(1, Math.ceil((p / 100) * sortedAsc.length)));
  return sortedAsc[rank - 1] ?? 0;
}

function summarizeWindow(rows: readonly UsageRow[]): AiUsageWindow {
  const requestCount = rows.length;
  const totalCostUsd = Number(
    rows.reduce((sum, row) => sum + num(row.estimatedCostUsd), 0).toFixed(6),
  );
  const latenciesAsc = rows.map((row) => row.latencyMs).sort((a, b) => a - b);
  const avgLatencyMs =
    requestCount > 0
      ? Math.round(latenciesAsc.reduce((sum, latency) => sum + latency, 0) / requestCount)
      : 0;
  const p95LatencyMs = Math.round(percentile(latenciesAsc, 95));
  const fallbackCount = rows.filter((row) => row.usedFallback).length;
  const fallbackRate = requestCount > 0 ? Number((fallbackCount / requestCount).toFixed(4)) : 0;

  const byProvider = ALL_PROVIDERS.map((provider) => {
    const providerRows = rows.filter((row) => row.provider === provider);
    const providerCount = providerRows.length;
    const providerFallbackCount = providerRows.filter((row) => row.usedFallback).length;
    return {
      provider,
      requestCount: providerCount,
      totalCostUsd: Number(
        providerRows.reduce((sum, row) => sum + num(row.estimatedCostUsd), 0).toFixed(6),
      ),
      avgLatencyMs:
        providerCount > 0
          ? Math.round(providerRows.reduce((sum, row) => sum + row.latencyMs, 0) / providerCount)
          : 0,
      fallbackRate:
        providerCount > 0 ? Number((providerFallbackCount / providerCount).toFixed(4)) : 0,
    };
  });

  return { requestCount, totalCostUsd, avgLatencyMs, p95LatencyMs, fallbackRate, byProvider };
}

/**
 * Aggregates `ai_evaluation_audits` — the table every AI completion is
 * already persisted to by `AiCompletionRecordedConsumer` — into the
 * cost/volume/latency/fallback numbers the Super Admin monitoring page needs.
 *
 * No new instrumentation: `AiGatewayAuditService.record()` already computes
 * real cost, latency, tokens and `usedFallback` on every call. This service
 * only reads what is already written.
 */
@Injectable()
export class AiGatewayUsageService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUsageSummary(): Promise<AiUsageSummaryDto> {
    const now = Date.now();
    const since30d = new Date(now - 30 * DAY_MS);
    const since24h = new Date(now - DAY_MS);

    // One query for the wider window; the 24h window is a cheap in-memory
    // filter of it rather than a second round trip.
    const rows30d = await this.prisma.aiEvaluationAudit.findMany({
      where: { createdAt: { gte: since30d } },
      select: {
        provider: true,
        latencyMs: true,
        usedFallback: true,
        estimatedCostUsd: true,
        createdAt: true,
      },
    });
    const rows24h = rows30d.filter((row) => row.createdAt >= since24h);

    return {
      last24h: summarizeWindow(rows24h),
      last30d: summarizeWindow(rows30d),
      errorRateAvailable: false,
    };
  }

  /**
   * I562 — real audit trail read: every AI call persisted by
   * `AiCompletionRecordedConsumer`, newest first.
   */
  async listAuditLogs(): Promise<ListAiAuditLogsResponse> {
    const rows = await this.prisma.aiEvaluationAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      logs: rows.map((row) => ({
        id: row.id,
        promptRef: row.promptRef,
        provider: row.provider,
        model: row.model,
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        latencyMs: row.latencyMs,
        estimatedCostUsd: num(row.estimatedCostUsd),
        responseId: row.responseId,
        createdAt: row.createdAt.toISOString(),
      })),
      total: rows.length,
    };
  }
}
