'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import type { FeatureFlagDto, FeatureFlagOverrideDto, SubscriptionPlanDto } from '@smart/contracts';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Switch } from '@smart/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smart/ui/tabs';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

function formatApiError(err: unknown, fallback: string): string {
  return isSmartApiError(err) ? err.message : fallback;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [flags, setFlags] = useState<FeatureFlagDto[]>([]);
  const [overrides, setOverrides] = useState<FeatureFlagOverrideDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, string>>({});

  async function load() {
    const [loadedPlans, loadedFlags, loadedOverrides] = await Promise.all([
      api.onboarding.listPlans(),
      api.onboarding.listFeatureFlags(),
      api.onboarding.listFeatureFlagOverrides(),
    ]);
    setPlans(loadedPlans);
    setFlags(loadedFlags);
    setOverrides(loadedOverrides);
    setCapacityDrafts(
      Object.fromEntries(
        loadedPlans.map((plan) => [plan.planId, plan.candidateCapacity?.toString() ?? '']),
      ),
    );
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load plans.'));
  }, []);

  async function toggleEntitlement(plan: SubscriptionPlanDto, key: string, enabled: boolean) {
    try {
      await api.onboarding.updatePlanEntitlements(plan.planId, {
        entitlements: [{ key, enabled }],
      });
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Could not update entitlement.'));
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
      setError(formatApiError(err, 'Could not update capacity.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={CreditCard}
        title="Plans & flags"
        description="Plans, the feature flag catalog, plan-level entitlements, and per-tenant overrides — four separate models, kept as separate views."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
          <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
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
                  <label className="text-sm">
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
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flags" className="mt-6">
          <DataTable headers={['Key', 'Name', 'Description']} empty={flags.length === 0}>
            {flags.map((flag) => (
              <TableRow key={flag.id}>
                <TableCell className="font-mono text-xs">{flag.key}</TableCell>
                <TableCell>{flag.name}</TableCell>
                <TableCell className="text-muted-foreground">{flag.description ?? '—'}</TableCell>
              </TableRow>
            ))}
          </DataTable>
          <p className="mt-3 text-sm text-muted-foreground">
            The flag catalog is seeded by the platform rather than authored here, so this view is
            read-only. Toggle a flag&apos;s default per plan under Entitlements, or override it for
            a single tenant under Overrides.
          </p>
        </TabsContent>

        <TabsContent value="entitlements" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.planId}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>Default flags granted to tenants on this plan.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {plan.entitlements.length === 0 ? (
                      <li className="text-muted-foreground">No feature flags seeded yet.</li>
                    ) : (
                      plan.entitlements.map((flag) => (
                        <li key={flag.key} className="flex items-center justify-between gap-2">
                          <span>{flag.name}</span>
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={(checked) =>
                              void toggleEntitlement(plan, flag.key, checked)
                            }
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
        </TabsContent>

        <TabsContent value="overrides" className="mt-6">
          <DataTable
            headers={['Tenant', 'Type', 'Flag', 'Enabled', 'Since']}
            empty={overrides.length === 0}
          >
            {overrides.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={
                      row.tenantType === 'institution'
                        ? `/admin/institutions/${row.tenantId}`
                        : `/admin/companies/${row.tenantId}`
                    }
                    className="underline underline-offset-4"
                  >
                    {row.tenantName}
                  </Link>
                </TableCell>
                <TableCell className="capitalize">{row.tenantType}</TableCell>
                <TableCell>{row.flagName}</TableCell>
                <TableCell>{row.enabled ? 'On' : 'Off'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(row.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
          <p className="mt-3 text-sm">
            Overrides are created and edited from the tenant&apos;s own detail page — this is a
            read-only consolidated view across every institution and company.{' '}
            <Link href="/admin/institutions" className="underline underline-offset-4">
              Go to institutions
            </Link>
            .
          </p>
        </TabsContent>
      </Tabs>
    </PageStack>
  );
}
