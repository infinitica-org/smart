'use client';

import { useEffect, useState } from 'react';
import type {
  AiHealthDto,
  AiUsageSummaryDto,
  AiUsageWindow,
  VerificationEventDto,
} from '@smart/contracts';
import { GitBranch, HeartPulse, RefreshCw, ServerCrash, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@smart/ui/card';
import { Button } from '@smart/ui/button';
import { Progress } from '@smart/ui/progress';

import { PageHeader } from '@/components/page-header';
import {
  InlineAlert,
  PageStack,
  EmptyState,
  DataTable,
  TableRow,
  TableCell,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="font-heading text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}

function UsageWindowCard({ title, window }: { title: string; window?: AiUsageWindow | null }) {
  const activeProviders = (window?.byProvider ?? []).filter(
    (provider) => provider.requestCount > 0,
  );
  const requestCount = window?.requestCount ?? 0;
  const totalCost = window?.totalCostUsd ?? 0;
  const avgLatency = window?.avgLatencyMs ?? 0;
  const p95Latency = window?.p95LatencyMs ?? 0;
  const fallbackRate = window?.fallbackRate ?? 0;

  return (
    <Card className="rounded-md border border-zinc-200/80 bg-white shadow-2xs">
      <CardHeader className="pb-3 border-b border-zinc-100">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-zinc-900">
          <span>{title}</span>
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">
            {requestCount.toLocaleString()} requests
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4">
        <UsageStat label="Cost" value={`$${totalCost.toFixed(2)}`} />
        <UsageStat label="Avg latency" value={`${avgLatency} ms`} />
        <UsageStat label="P95 latency" value={`${p95Latency} ms`} />
        <UsageStat label="Fallback rate" value={`${(fallbackRate * 100).toFixed(1)}%`} />
      </CardContent>
      {activeProviders.length > 0 ? (
        <CardContent className="grid gap-2 border-t border-zinc-100 pt-4 sm:grid-cols-3">
          {activeProviders.map((provider) => (
            <div
              key={provider.provider}
              className="rounded-md border border-zinc-200/70 bg-zinc-50/70 px-3 py-2 text-xs"
            >
              <p className="font-bold text-zinc-900">{provider.provider}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500 font-mono">
                {provider.requestCount} reqs · ${provider.totalCostUsd.toFixed(2)} ·{' '}
                {(provider.fallbackRate * 100).toFixed(0)}% fallback
              </p>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<AiHealthDto | null>(null);
  const [usage, setUsage] = useState<AiUsageSummaryDto | null>(null);
  const [verificationEvents, setVerificationEvents] = useState<VerificationEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  async function loadVerificationEvents() {
    try {
      const events = await api.onboarding.verificationEvents();
      setVerificationEvents(events ?? []);
    } catch {
      // ignore event fetching error if not available
    }
  }

  async function handleRetry(id: string) {
    try {
      await api.onboarding.retryVerificationEvent(id);
      setRetryNotice(`Outbox event ${id} queued for immediate retry.`);
      await loadVerificationEvents();
    } catch {
      setError(`Failed to retry outbox event ${id}.`);
    }
  }

  useEffect(() => {
    async function loadHealth() {
      setLoading(true);
      try {
        const [healthRes, usageRes] = await Promise.allSettled([
          api.onboarding.aiHealth(),
          api.onboarding.aiUsage(),
        ]);
        if (healthRes.status === 'fulfilled') {
          setHealth(healthRes.value);
        }
        if (usageRes.status === 'fulfilled') {
          setUsage(usageRes.value);
        }
        if (healthRes.status === 'rejected' && usageRes.status === 'rejected') {
          setError('AI Gateway telemetry is currently unavailable.');
        }
        await loadVerificationEvents();
      } catch {
        setError('Failed to fetch system monitoring telemetry.');
      } finally {
        setLoading(false);
      }
    }
    loadHealth().catch(() => {});
  }, []);

  const spendPct =
    health && health.monthlyCeilingUsd > 0
      ? Math.min(100, (health.monthlySpendUsd / health.monthlyCeilingUsd) * 100)
      : 0;

  const fallbackByProvider = new Map(
    (usage?.last24h?.byProvider ?? []).map((provider) => [provider.provider, provider] as const),
  );

  const providers = health?.providers ?? [];

  return (
    <PageStack>
      <PageHeader
        icon={HeartPulse}
        title="System & AI Gateway Monitoring"
        description="Live telemetry on LLM gateway circuits, operational cost, volume, latency, and automated fallback status."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-md border border-zinc-200/80 bg-white" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-32 animate-pulse rounded-md border border-zinc-200/80 bg-white" />
            <div className="h-32 animate-pulse rounded-md border border-zinc-200/80 bg-white" />
            <div className="h-32 animate-pulse rounded-md border border-zinc-200/80 bg-white" />
          </div>
        </div>
      ) : (
        <>
          {/* Scoring & Spend Ceiling */}
          <div className="rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                  Automated Candidate Evaluation Gateway
                </h3>
                <p className="text-xs text-zinc-500">
                  {health?.automatedScoringPaused
                    ? (health.pauseReason ?? 'Automated scoring paused by circuit breaker')
                    : 'Automated evaluation service is active and healthy'}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs border ${
                  health?.automatedScoringPaused
                    ? 'border-amber-200/90 bg-amber-50 text-amber-800'
                    : 'border-emerald-200/90 bg-emerald-50 text-emerald-800'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${health?.automatedScoringPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}
                />
                {health?.automatedScoringPaused ? 'Paused' : 'Active Pipeline'}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600">
                  Monthly Gateway Spend:{' '}
                  <strong className="font-mono text-zinc-900">
                    ${(health?.monthlySpendUsd ?? 0).toFixed(2)}
                  </strong>{' '}
                  / ${(health?.monthlyCeilingUsd ?? 500).toFixed(2)}
                </span>
                <span className="font-mono font-bold text-zinc-700">
                  {spendPct.toFixed(1)}% of ceiling
                </span>
              </div>
              <Progress value={spendPct} className="h-2 rounded-full" />
            </div>
          </div>

          {/* AI Providers Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                LLM Provider Circuit Status
              </h3>
              <span className="text-xs text-zinc-500">
                {providers.length} configured gateway backends
              </span>
            </div>

            {providers.length === 0 ? (
              <EmptyState icon={ServerCrash}>
                No LLM gateway providers configured in database.
              </EmptyState>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {providers.map((provider) => {
                  const providerUsage = fallbackByProvider.get(provider.provider);
                  return (
                    <div
                      key={provider.provider}
                      className="rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <span className="font-bold text-sm text-zinc-900">{provider.provider}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            provider.reachable
                              ? 'border-emerald-200/90 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200/90 bg-rose-50 text-rose-800'
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${provider.reachable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                          {provider.reachable ? 'Reachable' : 'Down'}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-zinc-600">
                          <span className="flex items-center gap-1.5">
                            <Timer className="size-3.5 text-zinc-400" />
                            Latency:
                          </span>
                          <strong className="font-mono text-zinc-900">
                            {provider.latencyMs ?? '—'} ms
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-zinc-600">
                          <span className="flex items-center gap-1.5">
                            <GitBranch className="size-3.5 text-zinc-400" />
                            Fallback Rate:
                          </span>
                          <strong className="font-mono text-zinc-900">
                            {providerUsage
                              ? `${(providerUsage.fallbackRate * 100).toFixed(0)}%`
                              : '0%'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-zinc-600">
                          <span>Circuit State:</span>
                          <span className="font-mono font-semibold text-zinc-800">
                            {provider.circuitState}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Usage Telemetry */}
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
              Usage & Token Volume Telemetry
            </h3>
            {usage ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <UsageWindowCard title="Last 24 hours" window={usage.last24h} />
                <UsageWindowCard title="Last 30 days" window={usage.last30d} />
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="h-36 rounded-md border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-xs text-zinc-400">
                  Usage telemetry not available yet
                </div>
                <div className="h-36 rounded-md border border-dashed border-zinc-200 bg-zinc-50 flex items-center justify-center text-xs text-zinc-400">
                  30-day telemetry not available yet
                </div>
              </div>
            )}
          </div>

          {/* 📬 Background Verification Event Queue & Retry (T14) */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between px-0.5">
              <div>
                <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
                  Background Verification Event Outbox Queue
                </h3>
                <p className="text-xs text-zinc-500">
                  Pending and failed asynchronous event dispatches. Admins can trigger manual
                  retries.
                </p>
              </div>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-700">
                {verificationEvents.length} {verificationEvents.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {retryNotice ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 flex justify-between items-center">
                <span>{retryNotice}</span>
                <button
                  type="button"
                  onClick={() => setRetryNotice(null)}
                  className="hover:underline text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <DataTable
              headers={[
                'Topic / Source',
                'Partition Key',
                'Status',
                'Attempts',
                'Last Error',
                'Created',
                'Action',
              ]}
              empty={verificationEvents.length === 0}
              emptyIcon={ServerCrash}
            >
              {verificationEvents.map((evt) => (
                <TableRow key={evt.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 text-xs font-mono">{evt.topic}</div>
                      <div className="text-[11px] text-zinc-500">Source: {evt.source}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-zinc-700">{evt.partitionKey}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${
                        evt.status === 'PUBLISHED'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : evt.status === 'FAILED'
                            ? 'border-rose-200 bg-rose-50 text-rose-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-zinc-700">{evt.attempts}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-600 max-w-xs truncate block font-mono">
                      {evt.lastError ?? 'None'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-600 font-mono">
                    {new Date(evt.createdAt).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {evt.status !== 'PUBLISHED' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 shadow-2xs gap-1"
                        onClick={() => void handleRetry(evt.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-zinc-700" />
                        Retry Event
                      </Button>
                    ) : (
                      <span className="text-[11px] text-zinc-400 font-semibold">Published</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
        </>
      )}
    </PageStack>
  );
}
