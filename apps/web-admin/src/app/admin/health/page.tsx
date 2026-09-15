'use client';

import { useEffect, useState } from 'react';
import type { AiHealthDto, AiUsageSummaryDto, AiUsageWindow } from '@smart/contracts';
import { CircleCheck, GitBranch, HeartPulse, ServerCrash, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Progress } from '@smart/ui/progress';
import { Badge } from '@smart/ui/badge';
import { PageHeader } from '@/components/page-header';
import { InlineAlert, PageStack } from '@/components/admin-ui';
import { api } from '@/lib/api';

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-card-foreground/60">{label}</p>
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function UsageWindowCard({ title, window }: { title: string; window: AiUsageWindow }) {
  const activeProviders = window.byProvider.filter((provider) => provider.requestCount > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          {title}
          <Badge variant="secondary">{window.requestCount} requests</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <UsageStat label="Cost" value={`$${window.totalCostUsd.toFixed(2)}`} />
        <UsageStat label="Avg latency" value={`${window.avgLatencyMs} ms`} />
        <UsageStat label="P95 latency" value={`${window.p95LatencyMs} ms`} />
        <UsageStat label="Fallback rate" value={`${(window.fallbackRate * 100).toFixed(1)}%`} />
      </CardContent>
      {activeProviders.length > 0 ? (
        <CardContent className="grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
          {activeProviders.map((provider) => (
            <div key={provider.provider} className="rounded-xl bg-muted px-3 py-2.5 text-sm">
              <p className="font-medium">{provider.provider}</p>
              <p className="text-xs text-card-foreground/70">
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.onboarding
      .aiHealth()
      .then(setHealth)
      .catch(() => setError('Failed to load AI health.'));
    api.onboarding
      .aiUsage()
      .then(setUsage)
      .catch(() => setError((prev) => prev ?? 'Failed to load AI usage.'));
  }, []);

  const spendPct =
    health && health.monthlyCeilingUsd > 0
      ? Math.min(100, (health.monthlySpendUsd / health.monthlyCeilingUsd) * 100)
      : 0;

  const fallbackByProvider = new Map(
    (usage?.last24h.byProvider ?? []).map((provider) => [provider.provider, provider] as const),
  );

  return (
    <PageStack>
      <PageHeader
        icon={HeartPulse}
        tone="inverse"
        title="Monitoring"
        description="AI gateway circuits, cost, volume, latency and provider fallback."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {health ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Scoring</CardTitle>
              <CardDescription>
                {health.automatedScoringPaused
                  ? (health.pauseReason ?? 'Automated scoring paused')
                  : 'Automated scoring running'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm tabular-nums">
                Spend ${health.monthlySpendUsd.toFixed(2)} / ${health.monthlyCeilingUsd.toFixed(2)}{' '}
                <span className="text-card-foreground/60">(trailing 30 days)</span>
              </p>
              <Progress value={spendPct} />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            {health.providers.map((provider) => {
              const providerUsage = fallbackByProvider.get(provider.provider);
              return (
                <Card key={provider.provider}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      {provider.provider}
                      <Badge
                        variant={provider.reachable ? 'default' : 'secondary'}
                        className={
                          provider.reachable ? 'bg-accent text-accent-foreground' : undefined
                        }
                      >
                        {provider.reachable ? <CircleCheck /> : <ServerCrash />}
                        {provider.reachable ? 'Reachable' : 'Down'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{provider.circuitState}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    <p className="flex items-center gap-2 text-sm text-card-foreground/70">
                      <Timer className="size-4" strokeWidth={1.75} />
                      Latency {provider.latencyMs ?? '—'} ms
                    </p>
                    <p className="flex items-center gap-2 text-sm text-card-foreground/70">
                      <GitBranch className="size-4" strokeWidth={1.75} />
                      Fallback{' '}
                      {providerUsage
                        ? `${(providerUsage.fallbackRate * 100).toFixed(0)}%`
                        : '—'}{' '}
                      <span className="text-card-foreground/50">(24h)</span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">AI usage</h2>
            {usage ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <UsageWindowCard title="Last 24 hours" window={usage.last24h} />
                <UsageWindowCard title="Last 30 days" window={usage.last30d} />
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="h-40 animate-pulse rounded-2xl bg-card" />
                <div className="h-40 animate-pulse rounded-2xl bg-card" />
              </div>
            )}
            <InlineAlert
              tone="info"
              title="Error rate isn't tracked yet — ai_evaluation_audits only records successful completions."
            />
          </div>
        </>
      ) : null}
    </PageStack>
  );
}
