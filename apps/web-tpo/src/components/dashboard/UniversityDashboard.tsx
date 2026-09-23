'use client';

import Link from 'next/link';
import { Briefcase, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import {
  buildUniversityRosterRows,
  computeUniversityDashboardMetrics,
  type StudentVerificationState,
} from '../../lib/university-dashboard-metrics';
import { greetingForHour } from '../../lib/tpo-dashboard-metrics';
import {
  bentoCardClass,
  bentoTableBodyRowClass,
  bentoTableCellClass,
  bentoTableClass,
  bentoTableHeadCellClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  dashboardPrimaryButtonClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';
import { DashboardHero } from './DashboardHero';

type UniversityDashboardProps = {
  students: InstitutionStudentDto[];
  claims: SkillClaimDto[];
  placementApplicationCount: number;
  institutionName: string;
  loading: boolean;
};

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || 'ST').toUpperCase();
}

function renderVerificationBadge(state: StudentVerificationState) {
  if (state === 'Full') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
        Verified (Full)
      </span>
    );
  }
  if (state === 'Partial') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
        <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 shadow-2xs">
      <span className="size-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
      Pending Action
    </span>
  );
}

function renderHiredBadge(hiredLabel: string) {
  if (hiredLabel === 'Hired' || hiredLabel === 'Placed' || hiredLabel === 'Offer Accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        {hiredLabel}
      </span>
    );
  }
  if (hiredLabel === '—' || hiredLabel === 'In Pipeline') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/90 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 shadow-2xs">
        <span className="size-1.5 rounded-full bg-blue-500" />
        In Pipeline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 shadow-2xs">
      <span className="size-1.5 rounded-full bg-zinc-400" />
      {hiredLabel}
    </span>
  );
}

export function UniversityDashboard({
  students,
  claims,
  placementApplicationCount,
  institutionName,
  loading,
}: UniversityDashboardProps) {
  const metrics = computeUniversityDashboardMetrics(students, claims, placementApplicationCount);
  const roster = buildUniversityRosterRows(students, claims);
  const greeting = greetingForHour(new Date().getHours());
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-5">
      <DashboardHero
        greeting={greeting}
        displayName={institutionName}
        formattedDate={formattedDate}
        loading={loading}
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Whitelisted Candidates',
            value: metrics.whitelisted,
            subtext: 'Enrolled institutional cohort',
            icon: UserCheck,
          },
          {
            label: 'Fully Verified',
            value: metrics.fullyVerified,
            subtext: 'Certified skill credentials',
            icon: ShieldCheck,
          },
          {
            label: 'Opportunities Matched',
            value: metrics.opportunitiesMatched,
            subtext: 'Active placement drives',
            icon: Briefcase,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`${bentoCardClass} !p-5 flex items-start justify-between gap-4 transition-all duration-200 hover:border-zinc-300`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {kpi.label}
                </p>
                {loading ? (
                  <div className={`${dashboardSkeletonClass} my-1 h-8 w-20 rounded-md`} />
                ) : (
                  <p className="font-heading text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                    {formatCount(kpi.value)}
                  </p>
                )}
                <p className="text-xs font-medium text-zinc-400 mt-1">{kpi.subtext}</p>
              </div>

              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs">
                <Icon className="size-5 stroke-[1.75]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Student Roster Card */}
      <section className={bentoCardClass}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200/80 pb-4">
          <div>
            <h2 className={dashboardSectionTitleClass}>Student roster</h2>
            <p className={`mt-0.5 ${dashboardSectionSubtitleClass}`}>
              Candidate cohort overview, verification progress, and active hiring status
            </p>
          </div>
          <Link href="/students" className={dashboardPrimaryButtonClass}>
            View all candidates
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className={`${dashboardSkeletonClass} mt-5 h-56 w-full rounded-lg`} />
        ) : roster.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 mb-3">
              <UserCheck className="size-5" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">No students whitelisted yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Upload your candidate roster or provision candidate access through the whitelist.
            </p>
            <Link href="/whitelist" className={`${dashboardPrimaryButtonClass} mt-4 inline-flex`}>
              Open Whitelist
            </Link>
          </div>
        ) : (
          <>
            <div className={`${bentoTableShellClass} mt-4`}>
              <table className={bentoTableClass}>
                <thead>
                  <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Major / Cohort</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3 text-right">Hired Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {roster.slice(0, 12).map((row) => (
                    <tr key={row.userId} className="transition-colors hover:bg-zinc-50/60">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 font-mono text-[11px] font-bold text-zinc-800 shadow-2xs">
                            {getInitials(row.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 text-sm">{row.name}</div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              ID: {row.userId.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-xs text-zinc-700">{row.major}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {renderVerificationBadge(row.verificationState)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        {renderHiredBadge(row.hiredLabel)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between px-1 text-xs text-zinc-400">
              <span>
                Showing {Math.min(roster.length, 12)} of {roster.length} registered candidates
              </span>
              <Link href="/students" className="font-semibold text-zinc-900 hover:underline">
                View full table →
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
