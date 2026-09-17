'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  GraduationCap,
  PauseCircle,
  ShieldAlert,
  ScrollText,
  ArrowUpRight,
  Users,
  Sparkles,
} from 'lucide-react';
import type { AdminDashboardDto, AiUsageSummaryDto } from '@smart/contracts';
import { InlineAlert } from '@/components/admin-ui';
import { KpiTile, OpsBoard, Panel, PlanMix, TenantMix } from '@/components/dashboard-widgets';
import { api } from '@/lib/api';

function LoadingOverview() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-56 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}

export default function AdminHomePage() {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageSummaryDto | null>(null);

  useEffect(() => {
    api.onboarding
      .dashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard.'));
    // Independent fetch: AI usage isn't part of AdminDashboardDto, and
    // failing to load it shouldn't block the rest of the dashboard.
    api.onboarding
      .aiUsage()
      .then(setAiUsage)
      .catch(() => undefined);
  }, []);

  if (error) return <InlineAlert tone="danger" title={error} />;
  if (!data) return <LoadingOverview />;

  const totalTenants = Math.max(data.institutions.total, 1);
  const activePct = Math.round((data.institutions.active / totalTenants) * 100);
  const planMax = Math.max(...data.planMix.map((row) => row.count), 1);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          icon={GraduationCap}
          tone="accent"
          label="Institutions"
          value={data.institutions.total}
          hint={`${data.institutions.active} active · ${data.institutions.held} held`}
          href="/admin/institutions"
        />
        <KpiTile
          icon={Users}
          tone="accent"
          label="Students"
          value={data.students.total}
          hint={`${data.students.active} active · ${data.students.held} held`}
          href="/admin/users"
        />
        <KpiTile
          icon={PauseCircle}
          tone="inverse"
          label="Held institutions"
          value={data.openHolds.institutions}
          hint="Paused tenant access"
          href="/admin/institutions"
        />
        <KpiTile
          icon={PauseCircle}
          tone="inverse"
          label="Held students"
          value={data.openHolds.students}
          hint="Paused candidate access"
          href="/admin/users"
        />
        <KpiTile
          icon={Building2}
          tone="inverse"
          label="Pending verification"
          value={data.pendingVerifications}
          hint={`${data.companies.pendingVerification} companies`}
        />
        <KpiTile
          icon={ShieldAlert}
          tone="muted"
          label="Integrity flags"
          value={data.flaggedAttempts}
          hint="Awaiting review"
          href="/admin/integrity"
        />
        <Link href="/admin/health" className="block rounded-2xl focus-visible:outline-none">
          <KpiTile
            icon={Sparkles}
            tone="accent"
            label="AI usage (24h)"
            value={aiUsage?.last24h.requestCount ?? 0}
            hint={
              aiUsage
                ? `$${aiUsage.last24h.totalCostUsd.toFixed(2)} spent · ${(aiUsage.last24h.fallbackRate * 100).toFixed(0)}% fallback`
                : 'Loading…'
            }
          />
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <TenantMix
          percent={activePct}
          legend={[
            {
              id: 'active',
              label: 'Active',
              value: data.institutions.active,
              color: 'var(--brand-teal)',
            },
            {
              id: 'held',
              label: 'On hold',
              value: data.institutions.held,
              color: '#ffffff',
            },
            {
              id: 'off',
              label: 'Deactivated',
              value: data.institutions.deactivated,
              color: 'var(--brand-ink)',
            },
          ]}
        />
        <PlanMix
          items={data.planMix.map((row) => ({
            id: row.code,
            label: row.code,
            value: row.count,
            max: planMax,
          }))}
        />
        <Panel
          title="Recent audit"
          description="Latest sensitive actions."
          action={
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-1 text-xs font-medium text-card-foreground/70 hover:text-card-foreground"
            >
              Open log
              <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
            </Link>
          }
        >
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-card-foreground/70">
              No audit events yet.{' '}
              <Link href="/admin/institutions" className="underline underline-offset-4">
                Add an institution
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {data.recentAudit.slice(0, 6).map((row) => (
                <li key={row.auditLogId} className="rounded-xl bg-muted px-3 py-2.5">
                  <p className="text-sm font-medium">{row.action}</p>
                  <p className="text-xs text-card-foreground/70">
                    {row.actorEmail ?? 'system'} · {new Date(row.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <OpsBoard
        steps={[
          {
            id: 'institutions',
            label: 'Institutions',
            hint: 'Campus tenants',
            value: data.institutions.total,
            icon: GraduationCap,
            href: '/admin/institutions',
          },
          {
            id: 'integrity',
            label: 'Integrity',
            hint: 'Flagged attempts',
            value: data.flaggedAttempts,
            icon: ShieldAlert,
            href: '/admin/integrity',
          },
          {
            id: 'holds-institutions',
            label: 'Held institutions',
            hint: 'Paused tenant access',
            value: data.openHolds.institutions,
            icon: PauseCircle,
            href: '/admin/institutions',
          },
          {
            id: 'holds-students',
            label: 'Held students',
            hint: 'Paused candidate access',
            value: data.openHolds.students,
            icon: PauseCircle,
            href: '/admin/users',
          },
          {
            id: 'audit',
            label: 'Audit events',
            hint: 'Recent trail',
            value: data.recentAudit.length,
            icon: ScrollText,
            href: '/admin/audit',
          },
        ]}
      />
    </div>
  );
}
