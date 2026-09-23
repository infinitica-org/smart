'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  ScrollText,
  ShieldAlert,
} from 'lucide-react';
import type { AdminDashboardDto, AiUsageSummaryDto } from '@smart/contracts';
import { InlineAlert } from '@/components/admin-ui';
import { AnimatedCircularProgressBar, NumberTicker } from '@smart/ui';
import { formatAuditAction, formatResourceType } from '@/lib/audit-actions';
import { api } from '@/lib/api';

function LoadingOverview() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-12 font-sans">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-md bg-white border border-zinc-200/80"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-md bg-white border border-zinc-200/80"
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-md bg-white border border-zinc-200/80"
          />
        ))}
      </div>
    </div>
  );
}

function getInitials(text: string | null | undefined): string {
  if (!text) return 'SY';
  const parts = text.split('@')[0]?.split(/[._ -]/) || [];
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

export default function AdminHomePage() {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageSummaryDto | null>(null);

  useEffect(() => {
    api.onboarding
      .dashboard()
      .then(setData)
      .catch(() => setError('Failed to load live database dashboard.'));

    api.onboarding
      .aiUsage()
      .then(setAiUsage)
      .catch(() => undefined);
  }, []);

  if (error) return <InlineAlert tone="danger" title={error} />;
  if (!data) return <LoadingOverview />;

  const totalTenants = Math.max(data.institutions.total, 1);
  const activePct = Math.round((data.institutions.active / totalTenants) * 100);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12 font-sans pt-2">
      {/* 📊 7 Stat Cards Grid - Clean Monochrome SaaS Styling */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900">
              Platform Overview
            </h2>
            <p className="text-xs text-zinc-500">Live operational counters from database</p>
          </div>
          <span className="text-[11px] font-medium text-zinc-400">7 active monitors</span>
        </div>

        {/* Row 1: 4 Primary Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Universities live */}
          <Link
            href="/admin/institutions"
            className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Universities live
              </p>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <GraduationCap className="size-5 stroke-[1.75]" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                <NumberTicker value={data.institutions.active} className="text-zinc-950" />
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">Active campus tenants</p>
            </div>
          </Link>

          {/* Card 2: Pending provisioning */}
          <Link
            href="/admin/institutions"
            className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Pending provisioning
              </p>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <Clock className="size-5 stroke-[1.75]" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                <NumberTicker value={data.institutions.held} className="text-zinc-950" />
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">Awaiting admin review</p>
            </div>
          </Link>

          {/* Card 3: Employers verified */}
          <Link
            href="/admin/companies"
            className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Employers verified
              </p>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <Building2 className="size-5 stroke-[1.75]" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                <NumberTicker value={data.companies.total} className="text-zinc-950" />
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">Partner companies</p>
            </div>
          </Link>

          {/* Card 4: Pending verification */}
          <Link
            href="/admin/companies"
            className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Pending verification
              </p>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <CheckCircle2 className="size-5 stroke-[1.75]" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                <NumberTicker
                  value={data.companies.pendingVerification}
                  className="text-zinc-950"
                />
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">Employer review queue</p>
            </div>
          </Link>
        </div>

        {/* Row 2: 3 Specialized Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 5: Endorsements pending */}
          <Link
            href="/admin/verification"
            className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Endorsements pending
              </p>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <Clock className="size-5 stroke-[1.75]" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                <NumberTicker value={data.pendingVerifications} className="text-zinc-950" />
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">Awaiting credential issuance</p>
            </div>
          </Link>

          {/* Card 6: AI defense interviews run (30d) */}
          <Link
            href="/admin/health"
            className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                AI defense interviews run (30d)
              </p>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <Bot className="size-5 stroke-[1.75]" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                <NumberTicker
                  value={aiUsage?.last30d?.requestCount ?? 0}
                  className="text-zinc-950"
                />
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">Automated candidate defense</p>
            </div>
          </Link>

          {/* Card 7: Flagged profiles */}
          <Link
            href="/admin/integrity"
            className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Flagged profiles
              </p>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <ShieldAlert className="size-5 stroke-[1.75]" />
              </div>
            </div>
            <div className="mt-2">
              <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                <NumberTicker value={data.flaggedAttempts} className="text-zinc-950" />
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">Trust & safety anomalies</p>
            </div>
          </Link>
        </div>
      </section>

      {/* 📊 Main Content Bento: Recent Activity & Tenant Breakdown */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* Panel 1: Recent Activity from Live Audit Log */}
        <section className="xl:col-span-2 relative overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900">
                  Recent Activity
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Live sensitive administrative mutations and tenant operations
                </p>
              </div>
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline"
              >
                Full audit log
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {data.recentAudit.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-10 text-center">
                <ScrollText className="mx-auto size-8 text-zinc-400 mb-2" />
                <p className="text-xs font-semibold text-zinc-700">No recent activity logged yet</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Administrative actions and tenant lifecycle changes will appear here in real time.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {data.recentAudit.map((row) => (
                  <li
                    key={row.auditLogId}
                    className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 p-3 transition-colors hover:border-zinc-200 hover:bg-zinc-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 font-mono text-xs font-bold shadow-2xs">
                        {getInitials(row.actorEmail)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-zinc-900">
                            {formatAuditAction(row.action)}
                          </p>
                          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                            {formatResourceType(row.resourceType)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          Resource:{' '}
                          <strong className="font-mono text-zinc-700">
                            {row.resourceId ? row.resourceId.slice(0, 8) : '—'}
                          </strong>
                          {' · '}
                          Actor:{' '}
                          <strong className="font-mono text-zinc-700">
                            {row.actorEmail ?? 'System'}
                          </strong>
                        </p>
                        {row.reasonCode ? (
                          <p className="text-[10px] text-zinc-400 italic mt-0.5">
                            Reason: {row.reasonCode}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-400">
                      {new Date(row.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Panel 2: Institutional Tenant Health */}
        <section className="relative overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs md:p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-zinc-100 pb-4">
              <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900">
                Tenant Health
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Active universities versus held/provisioning
              </p>
            </div>

            <div className="mt-5 flex flex-col items-center gap-5">
              <AnimatedCircularProgressBar
                value={activePct}
                label="Live"
                className="size-28"
                gaugePrimaryColor="#18181b"
                gaugeSecondaryColor="#f4f4f5"
              />

              <ul className="w-full space-y-2 text-xs">
                <li className="flex items-center justify-between rounded-lg bg-zinc-50/80 px-3 py-2 border border-zinc-100">
                  <span className="flex items-center gap-2 font-medium text-zinc-700">
                    <span className="size-2 rounded-full bg-zinc-900" />
                    Active Universities
                  </span>
                  <span className="font-mono font-bold text-zinc-900">
                    {data.institutions.active}
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-zinc-50/80 px-3 py-2 border border-zinc-100">
                  <span className="flex items-center gap-2 font-medium text-zinc-700">
                    <span className="size-2 rounded-full bg-zinc-400" />
                    Pending Provisioning
                  </span>
                  <span className="font-mono font-bold text-zinc-900">
                    {data.institutions.held}
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-zinc-50/80 px-3 py-2 border border-zinc-100">
                  <span className="flex items-center gap-2 font-medium text-zinc-700">
                    <span className="size-2 rounded-full bg-zinc-300" />
                    Deactivated / Archived
                  </span>
                  <span className="font-mono font-bold text-zinc-900">
                    {data.institutions.deactivated}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-center">
            <Link
              href="/admin/institutions"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:underline"
            >
              Configure institutions directory
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      </div>

      {/* Operational Queues Bar */}
      <section className="relative overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs md:p-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900">
              Operational Queues
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Direct access to system operations and pending verifications
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/institutions"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">Universities Directory</p>
                <p className="text-[11px] text-zinc-500">{data.institutions.active} live tenants</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/admin/companies"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <Building2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">Employers Directory</p>
                <p className="text-[11px] text-zinc-500">
                  {data.companies.total.toLocaleString()} registered
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/admin/verification"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">Verification Queue</p>
                <p className="text-[11px] text-zinc-500">
                  {data.pendingVerifications.toLocaleString()} pending
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/admin/integrity"
            className="group flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/70 p-4 transition-all hover:border-zinc-300 hover:bg-white hover:shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900">Trust & Safety</p>
                <p className="text-[11px] text-zinc-500">{data.flaggedAttempts} flagged items</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </section>
    </div>
  );
}
