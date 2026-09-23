'use client';

import Link from 'next/link';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import {
  buildUniversityRosterRows,
  computeUniversityDashboardMetrics,
  type StudentVerificationState,
} from '../../lib/university-dashboard-metrics';
import {
  bentoCardClass,
  bentoTableBodyRowClass,
  bentoTableCellClass,
  bentoTableClass,
  bentoTableHeadCellClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';

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

function verificationBadgeClass(state: StudentVerificationState): string {
  if (state === 'Full') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
  }
  if (state === 'Partial') {
    return 'bg-amber-50 text-amber-900 border-amber-200/80';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200/80';
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ds-text)] md:text-3xl">
          {institutionName}
        </h1>
        <p className={dashboardSectionSubtitleClass}>
          Whitelist, verification, and placement activity for your cohort.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            { label: 'Whitelisted', value: metrics.whitelisted },
            { label: 'Fully verified', value: metrics.fullyVerified },
            { label: 'Opportunities matched', value: metrics.opportunitiesMatched },
          ] as const
        ).map((kpi) => (
          <div
            key={kpi.label}
            className={`${bentoCardClass} flex flex-col justify-center px-6 py-8 text-center`}
          >
            {loading ? (
              <div className={`${dashboardSkeletonClass} mx-auto h-10 w-24 rounded-lg`} />
            ) : (
              <p className="text-3xl font-semibold tracking-tight text-[var(--ds-text)] sm:text-4xl">
                {formatCount(kpi.value)}
              </p>
            )}
            <p className="mt-2 text-sm font-medium text-[var(--ds-text-muted)]">{kpi.label}</p>
          </div>
        ))}
      </div>

      <section className={bentoCardClass}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={dashboardSectionTitleClass}>Student roster</h2>
            <p className={dashboardSectionSubtitleClass}>
              Major, verification progress, and hire status
            </p>
          </div>
          <Link
            href="/students"
            className="text-sm font-semibold text-[var(--ds-link)] hover:underline"
          >
            View all students
          </Link>
        </div>

        {loading ? (
          <div className={`${dashboardSkeletonClass} mt-5 h-56 w-full rounded-2xl`} />
        ) : roster.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--ds-text)]">
              No students whitelisted yet
            </p>
            <Link
              href="/whitelist"
              className="mt-3 inline-block text-sm font-semibold text-[var(--ds-link)]"
            >
              Open whitelist
            </Link>
          </div>
        ) : (
          <div className={`${bentoTableShellClass} mt-5`}>
            <table className={bentoTableClass}>
              <thead>
                <tr className={bentoTableHeadRowClass}>
                  <th className={bentoTableHeadCellClass}>Student</th>
                  <th className={bentoTableHeadCellClass}>Major</th>
                  <th className={bentoTableHeadCellClass}>Verification</th>
                  <th className={bentoTableHeadCellClass}>Hired</th>
                </tr>
              </thead>
              <tbody>
                {roster.slice(0, 12).map((row) => (
                  <tr key={row.userId} className={bentoTableBodyRowClass}>
                    <td className={`${bentoTableCellClass} font-semibold text-[var(--ds-text)]`}>
                      {row.name}
                    </td>
                    <td className={bentoTableCellClass}>{row.major}</td>
                    <td className={bentoTableCellClass}>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verificationBadgeClass(row.verificationState)}`}
                      >
                        {row.verificationState}
                      </span>
                    </td>
                    <td className={`${bentoTableCellClass} text-[var(--ds-text-muted)]`}>
                      {row.hiredLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
