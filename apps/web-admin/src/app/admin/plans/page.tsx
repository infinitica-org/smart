'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Card, CardDescription, CardHeader, CardTitle } from '@smart/ui';
import type { SubscriptionPlanDto } from '@smart/contracts';
import { api } from '../../../lib/api';
import { useRequireAuth } from '../../../lib/auth';

export default function PlansPage() {
  useRequireAuth();
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.onboarding
      .listPlans()
      .then(setPlans)
      .catch(() => setError('Failed to load plans.'));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Pricing & plans</CardTitle>
          <CardDescription>
            Free / Basic / Pro entitlements. There is no payment processor this sprint — assigning a
            plan on an institution is an entitlement switch only. Change a tenant&apos;s plan from
            its detail page.
          </CardDescription>
        </CardHeader>
      </Card>
      {error ? <Alert tone="danger" title={error} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.planId}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                {plan.institutionCount} institution{plan.institutionCount === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <ul className="px-6 pb-6 text-sm space-y-1">
              {plan.entitlements.length === 0 ? (
                <li className="text-[var(--text-muted)]">No feature flags seeded yet.</li>
              ) : (
                plan.entitlements.map((flag) => (
                  <li key={flag.key}>
                    {flag.name}: {flag.enabled ? 'on' : 'off'}
                  </li>
                ))
              )}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-sm">
        <Link href="/admin/institutions" className="underline">
          Assign a plan from an institution
        </Link>
      </p>
    </div>
  );
}
