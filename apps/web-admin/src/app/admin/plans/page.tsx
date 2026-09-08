'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import type { SubscriptionPlanDto } from '@smart/contracts';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Switch } from '@smart/ui/switch';
import { PageHeader } from '@/components/page-header';
import { AdminInput, InlineAlert, PageStack } from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, string>>({});

  async function load() {
    const loaded = await api.onboarding.listPlans();
    setPlans(loaded);
    setCapacityDrafts(
      Object.fromEntries(
        loaded.map((plan) => [plan.planId, plan.candidateCapacity?.toString() ?? '']),
      ),
    );
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load plans.'));
  }, []);

  async function toggle(plan: SubscriptionPlanDto, key: string, enabled: boolean) {
    try {
      await api.onboarding.updatePlanEntitlements(plan.planId, {
        entitlements: [{ key, enabled }],
      });
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update flag.');
    }
  }

  async function saveCapacity(plan: SubscriptionPlanDto) {
    const raw = capacityDrafts[plan.planId] ?? '';
    const candidateCapacity = raw.trim() === '' ? null : Number(raw);
    if (
      candidateCapacity !== null &&
      (!Number.isInteger(candidateCapacity) || candidateCapacity < 1)
    ) {
      setError('Candidate capacity must be a positive whole number, or blank for unlimited.');
      return;
    }
    try {
      await api.onboarding.updatePlanCapacity(plan.planId, { candidateCapacity });
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update capacity.');
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={CreditCard}
        title="Pricing & flags"
        description="Boolean entitlements per plan. No payment processor — toggling a flag here changes what tenants on that plan receive. Per-tenant overrides live on the institution page."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.planId}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                {plan.institutionCount} institution{plan.institutionCount === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-end gap-2">
                <label className="flex-1 text-sm">
                  <span className="mb-1 block text-muted-foreground">
                    Candidate capacity (blank = unlimited)
                  </span>
                  <AdminInput
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="Unlimited"
                    value={capacityDrafts[plan.planId] ?? ''}
                    onChange={(event) =>
                      setCapacityDrafts((prev) => ({
                        ...prev,
                        [plan.planId]: event.target.value,
                      }))
                    }
                    onBlur={() => void saveCapacity(plan)}
                  />
                </label>
              </div>
              <ul className="space-y-3 text-sm">
                {plan.entitlements.length === 0 ? (
                  <li className="text-muted-foreground">No feature flags seeded yet.</li>
                ) : (
                  plan.entitlements.map((flag) => (
                    <li key={flag.key} className="flex items-center justify-between gap-2">
                      <span>{flag.name}</span>
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(checked) => void toggle(plan, flag.key, checked)}
                        aria-label={flag.name}
                      />
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm">
        <Link
          href="/admin/institutions"
          className="inline-flex items-center gap-1 underline underline-offset-4"
        >
          Assign a plan or override flags from an institution
        </Link>
      </p>
    </PageStack>
  );
}
