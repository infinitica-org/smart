'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, ShieldCheck, Users, Briefcase, ClipboardList } from 'lucide-react';
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || 'MA').toUpperCase();
}

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
    <section className="rounded-xl border border-zinc-200/80 bg-white shadow-2xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 bg-white px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <Download className="size-3.5" aria-hidden />
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
    if (typeof window !== 'undefined') {
      document.title = 'Reports & Analytics · SMART TPO';
    }
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
    <div className="space-y-4 pb-12">
      <TpoBentoPageHeader
        title="Reports"
        description="Export verification, placement, and employer engagement data for your career center."
        icon={BarChart3}
        badge={
          <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
            {students.length} Candidates
          </span>
        }
      />

      {/* Top Placement & Opportunities KPI Grid */}
      <ReportSection
        title="Placement & opportunities matched"
        description="Cohort readiness against active openings and recorded applications."
        onExport={() => exportPlacementOpportunitiesCsv(placementSummary)}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Whitelisted students',
              value: placementSummary.whitelisted,
              icon: Users,
              subtext: 'Enrolled candidates',
            },
            {
              label: 'Fully verified',
              value: placementSummary.fullyVerified,
              icon: ShieldCheck,
              subtext: 'Verified credentials',
              accent: 'emerald',
            },
            {
              label: 'Active openings',
              value: placementSummary.activeOpenings,
              icon: Briefcase,
              subtext: 'Active placement drives',
            },
            {
              label: 'Applications matched',
              value: placementSummary.totalApplications,
              icon: ClipboardList,
              subtext: 'Submitted applications',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 shadow-2xs transition-all hover:bg-white hover:border-zinc-300"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    {kpi.label}
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
                    {loading ? '—' : kpi.value.toLocaleString('en-US')}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">{kpi.subtext}</p>
                </div>
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${
                    kpi.accent === 'emerald'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-zinc-200/80 bg-white text-zinc-800'
                  }`}
                >
                  <Icon className="size-5 stroke-[1.75]" />
                </div>
              </div>
            );
          })}
        </div>
      </ReportSection>

      {/* Verification by Major Section */}
      <ReportSection
        title="Verification completion by major"
        description="Whitelisted students grouped by major (batch), with full vs partial verification."
        onExport={() => exportVerificationByMajorCsv(verificationRows)}
      >
        <div className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Major</th>
                  <th className="px-4 py-3">Whitelisted</th>
                  <th className="px-4 py-3">Fully verified</th>
                  <th className="px-4 py-3">Partial</th>
                  <th className="px-4 py-3 text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : verificationRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-zinc-500">
                      No students on the whitelist yet.
                    </td>
                  </tr>
                ) : (
                  verificationRows.map((row) => (
                    <tr key={row.major} className="transition-colors hover:bg-zinc-50/60">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                            {getInitials(row.major)}
                          </span>
                          <span className="font-bold text-zinc-900">{row.major}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-zinc-700">{row.whitelisted}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
                          <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                          {row.fullyVerified} Verified
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-zinc-700">{row.partial}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${Math.min(row.completionPct, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-zinc-900">
                            {row.completionPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ReportSection>

      {/* Employer Engagement by School */}
      <ReportSection
        title="Employer engagement by school"
        description="Companies recruiting at your institution — openings and applicant volume."
        onExport={() => exportEmployerEngagementCsv(employerEngagement)}
      >
        <div className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Employer</th>
                  <th className="px-4 py-3">Active openings</th>
                  <th className="px-4 py-3">Total openings</th>
                  <th className="px-4 py-3 text-right">Applications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : employerEngagement.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-500">
                      No employers in the repository yet.
                    </td>
                  </tr>
                ) : (
                  employerEngagement.map((row) => (
                    <tr key={row.employerName} className="transition-colors hover:bg-zinc-50/60">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                            {getInitials(row.employerName)}
                          </span>
                          <span className="font-bold text-zinc-900">{row.employerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-zinc-700">{row.activeOpenings}</td>
                      <td className="px-4 py-3.5 font-mono text-zinc-700">{row.totalOpenings}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900">
                        {row.applications}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ReportSection>
    </div>
  );
}
