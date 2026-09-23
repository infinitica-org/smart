'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import type { InstitutionStudentDto, JobOpeningDto, SkillClaimDto } from '@smart/contracts';
import { TpoBentoPageHeader } from '../tpo-bento/TpoBentoPageHeader';
import { api, employersApi, openingsApi } from '../../lib/api';
import { countInstitutionPlacementApplications } from '../../lib/placement-application-count';
import {
  applicationCountByEmployerId,
  buildEmployerEngagementRows,
  buildPlacementOpportunitiesSummary,
  buildVerificationByMajorRows,
  exportEmployerEngagementCsv,
  exportPlacementOpportunitiesCsv,
  exportVerificationByMajorCsv,
} from '../../lib/tpo-reports-export';
import {
  bentoCardClass,
  bentoPageStackClass,
  bentoTableBodyRowClass,
  bentoTableCellClass,
  bentoTableClass,
  bentoTableHeadCellClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  dashboardPrimaryButtonClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
} from '../../lib/tpo-dashboard-ui';

function ReportSection({
  title,
  description,
  onExport,
  children,
}: {
  title: string;
  description: string;
  onExport: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={bentoCardClass}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ds-border-subtle)] px-5 py-4">
        <div>
          <h2 className={dashboardSectionTitleClass}>{title}</h2>
          <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>{description}</p>
        </div>
        <button type="button" onClick={onExport} className={dashboardPrimaryButtonClass}>
          <Download className="size-4" aria-hidden />
          Export CSV
        </button>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function UniversityReportsExport() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [applicationTotal, setApplicationTotal] = useState(0);
  const [employerEngagement, setEmployerEngagement] = useState<
    ReturnType<typeof buildEmployerEngagementRows>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      api.onboarding.listTpoStudents().catch(() => [] as InstitutionStudentDto[]),
      api.assessment.listSkillClaims().catch(() => [] as SkillClaimDto[]),
      openingsApi.list().catch(() => ({ openings: [] as JobOpeningDto[] })),
      employersApi.list().catch(() => ({ employers: [] })),
      countInstitutionPlacementApplications().catch(() => ({
        total: 0,
        byOpeningId: new Map<string, number>(),
      })),
    ])
      .then(([studentList, claimList, openingsRes, employersRes, appCounts]) => {
        if (!active) return;
        setStudents(studentList);
        setClaims(claimList);
        setOpenings(openingsRes.openings);
        setApplicationTotal(appCounts.total);
        const byEmployer = applicationCountByEmployerId(
          openingsRes.openings,
          appCounts.byOpeningId,
        );
        setEmployerEngagement(buildEmployerEngagementRows(employersRes.employers, byEmployer));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const verificationRows = useMemo(
    () => buildVerificationByMajorRows(students, claims),
    [students, claims],
  );

  const placementSummary = useMemo(
    () => buildPlacementOpportunitiesSummary(students, claims, openings, applicationTotal),
    [students, claims, openings, applicationTotal],
  );

  return (
    <div className={bentoPageStackClass}>
      <TpoBentoPageHeader
        title="Reports"
        description="Export verification, placement, and employer engagement data for your career center."
        icon={BarChart3}
        accent="lavender"
      />

      <ReportSection
        title="Verification completion by major"
        description="Whitelisted students grouped by major (batch), with full vs partial verification."
        onExport={() => exportVerificationByMajorCsv(verificationRows)}
      >
        <div className={bentoTableShellClass}>
          <table className={`${bentoTableClass} min-w-[640px]`}>
            <thead>
              <tr className={bentoTableHeadRowClass}>
                <th className={bentoTableHeadCellClass}>Major</th>
                <th className={bentoTableHeadCellClass}>Whitelisted</th>
                <th className={bentoTableHeadCellClass}>Fully verified</th>
                <th className={bentoTableHeadCellClass}>Partial</th>
                <th className={bentoTableHeadCellClass}>Completion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`${bentoTableCellClass} py-8 text-center`}>
                    Loading…
                  </td>
                </tr>
              ) : verificationRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${bentoTableCellClass} py-8 text-center`}>
                    No students on the whitelist yet.
                  </td>
                </tr>
              ) : (
                verificationRows.map((row) => (
                  <tr key={row.major} className={bentoTableBodyRowClass}>
                    <td className={`${bentoTableCellClass} font-semibold`}>{row.major}</td>
                    <td className={bentoTableCellClass}>{row.whitelisted}</td>
                    <td className={bentoTableCellClass}>{row.fullyVerified}</td>
                    <td className={bentoTableCellClass}>{row.partial}</td>
                    <td className={bentoTableCellClass}>{row.completionPct}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection
        title="Placement & opportunities matched"
        description="Cohort readiness against active openings and recorded applications."
        onExport={() => exportPlacementOpportunitiesCsv(placementSummary)}
      >
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['Whitelisted students', placementSummary.whitelisted],
              ['Fully verified', placementSummary.fullyVerified],
              ['Active openings', placementSummary.activeOpenings],
              ['Applications matched', placementSummary.totalApplications],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-5 text-center"
            >
              <dt className="text-xs font-medium text-[var(--ds-text-muted)]">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-[var(--ds-text)]">
                {loading ? '—' : value.toLocaleString('en-US')}
              </dd>
            </div>
          ))}
        </dl>
      </ReportSection>

      <ReportSection
        title="Employer engagement by school"
        description="Companies recruiting at your institution — openings and applicant volume."
        onExport={() => exportEmployerEngagementCsv(employerEngagement)}
      >
        <div className={bentoTableShellClass}>
          <table className={`${bentoTableClass} min-w-[640px]`}>
            <thead>
              <tr className={bentoTableHeadRowClass}>
                <th className={bentoTableHeadCellClass}>Employer</th>
                <th className={bentoTableHeadCellClass}>Active openings</th>
                <th className={bentoTableHeadCellClass}>Total openings</th>
                <th className={bentoTableHeadCellClass}>Applications</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={`${bentoTableCellClass} py-8 text-center`}>
                    Loading…
                  </td>
                </tr>
              ) : employerEngagement.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`${bentoTableCellClass} py-8 text-center`}>
                    No employers in the repository yet.
                  </td>
                </tr>
              ) : (
                employerEngagement.map((row) => (
                  <tr key={row.employerName} className={bentoTableBodyRowClass}>
                    <td className={`${bentoTableCellClass} font-semibold`}>{row.employerName}</td>
                    <td className={bentoTableCellClass}>{row.activeOpenings}</td>
                    <td className={bentoTableCellClass}>{row.totalOpenings}</td>
                    <td className={bentoTableCellClass}>{row.applications}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  );
}
