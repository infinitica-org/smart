'use client';

import { useEffect, useState } from 'react';
import type { AiHealthDto } from '@smart/contracts';
import { CircleCheck, HeartPulse, ServerCrash, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Progress } from '@smart/ui/progress';
import { Badge } from '@smart/ui/badge';
import { PageHeader } from '@/components/page-header';
import { InlineAlert, PageStack } from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function MonitoringPage() {
  const [health, setHealth] = useState<AiHealthDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.onboarding
      .aiHealth()
      .then(setHealth)
      .catch(() => setError('Failed to load AI health.'));
  }, []);

  const spendPct =
    health && health.monthlyCeilingUsd > 0
      ? Math.min(100, (health.monthlySpendUsd / health.monthlyCeilingUsd) * 100)
      : 0;

  return (
    <PageStack>
      <PageHeader
        icon={HeartPulse}
        tone="inverse"
        title="Monitoring"
        description="AI gateway circuits, token budget, and scoring pause."
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
                Spend ${health.monthlySpendUsd.toFixed(2)} / ${health.monthlyCeilingUsd.toFixed(2)}
              </p>
              <Progress value={spendPct} />
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-3">
            {health.providers.map((provider) => (
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
                <CardContent>
                  <p className="flex items-center gap-2 text-sm text-card-foreground/70">
                    <Timer className="size-4" strokeWidth={1.75} />
                    Latency {provider.latencyMs ?? '—'} ms
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </PageStack>
  );
}
