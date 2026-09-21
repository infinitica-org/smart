'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  proficiencyLevelUiLabel,
  type InstitutionStudentDto,
  type SkillClaimDto,
} from '@smart/contracts';
import { DashboardMetricCard } from '../../../components/dashboard/DashboardMetricCard';
import { TpoBentoPageHeader } from '../../../components/tpo-bento/TpoBentoPageHeader';
import { api } from '../../../lib/api';
import { computeDashboardMetrics } from '../../../lib/tpo-dashboard-metrics';
import {
  categoryLabel,
  categoryNameForSkillCode,
  skillCategoryFor,
} from '../../../lib/skill-taxonomy';
import {
  bentoChipClass,
  bentoPageStackClass,
  bentoTableBodyRowClass,
  bentoTableCellClass,
  bentoTableClass,
  bentoTableHeadCellClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  bentoToolbarClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
  dashboardPillClass,
  dashboardPrimaryButtonClass,
} from '../../../lib/tpo-dashboard-ui';
import { selectClass } from '../../../lib/tpo-ui';

export default function ReportsPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [claims, setClaims] = useState<SkillClaimDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [proficiencyFilter, setProficiencyFilter] = useState<string>('ALL');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.onboarding.listTpoStudents().catch(() => [] as InstitutionStudentDto[]),
      api.assessment.listSkillClaims().catch(() => [] as SkillClaimDto[]),
    ])
      .then(([studentList, claimList]) => {
        setStudents(studentList);
        setClaims(claimList);
      })
      .finally(() => setLoading(false));
  }, []);

  const metrics = computeDashboardMetrics(students, claims);
  const categoriesCovered = Object.keys(metrics.categoryCounts).length;

  const filteredStudents = students.filter((student) => {
    const studentClaims = claims.filter((c) => c.studentId === student.userId);
    if (categoryFilter !== 'ALL') {
      const hasCategory = studentClaims.some(
        (claim) => skillCategoryFor(claim.skillCode) === categoryFilter,
      );
      if (!hasCategory && studentClaims.length > 0) return false;
    }
    if (skillFilter !== 'ALL') {
      if (!studentClaims.some((c) => c.skillCode === skillFilter)) return false;
    }
    if (proficiencyFilter !== 'ALL') {
      if (!studentClaims.some((c) => c.proficiency === proficiencyFilter)) return false;
    }
    return true;
  });

  function handleExportCsv() {
    const headers = [
      'Candidate ID',
      'Full Name',
      'Email Address',
      'Batch Name',
      'Primary Skill Category',
      'Onboarding Status',
      'Verified Credentials Count',
      'Skills List',
    ];
    const formatCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };
    const rows = filteredStudents.map((student) => {
      const studentClaims = claims.filter((c) => c.studentId === student.userId);
      const verifiedClaims = studentClaims.filter((c) => c.status === 'VERIFIED');
      const firstClaim = studentClaims[0];
      const candidateCategory = firstClaim
        ? categoryNameForSkillCode(firstClaim.skillCode)
        : categoryLabel('PROGRAMMING_LANGUAGES');
      const skillNames = studentClaims
        .map((c) => SKILL_DEFINITIONS.find((s) => s.code === c.skillCode)?.name ?? c.skillCode)
        .join('; ');
      return [
        formatCell(student.userId),
        formatCell(student.fullName),
        formatCell(student.email),
        formatCell(student.batchName ?? 'N/A'),
        formatCell(candidateCategory),
        formatCell(student.inviteStatus === 'ACCEPTED' ? 'Completed' : 'Pending'),
        verifiedClaims.length,
        formatCell(skillNames || 'Enrolled Core Skills'),
      ];
    });
    const csvContent =
      '\uFEFF' +
      [headers.map((h) => formatCell(h)).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `smart_tpo_cohort_telemetry_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className={bentoPageStackClass}>
      <TpoBentoPageHeader
        title="Cohort Reporting & Export"
        description="Generate and export cohort reports detailing candidate streams, skills, and verification status."
        icon={BarChart3}
        accent="lavender"
        badge={<span className={bentoChipClass}>CSV Export Ready</span>}
        actions={
          <button type="button" onClick={handleExportCsv} className={dashboardPrimaryButtonClass}>
            <Download className="size-4" /> Export CSV Report ({filteredStudents.length})
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        <DashboardMetricCard
          label="Total Candidates"
          value={metrics.totalProvisioned}
          hint="Onboarded across the cohort"
          footnote="All-time total"
          icon={Users}
          accent="blue"
          loading={loading}
        />
        <DashboardMetricCard
          label="Verified Skills"
          value={metrics.verifiedClaimsCount}
          hint="Autonomous certified credentials"
          footnote={
            metrics.verifiedClaimsCount === 0
              ? 'No verified skills yet'
              : 'Verified credentials on platform'
          }
          icon={Award}
          accent="mint"
          loading={loading}
        />
        <DashboardMetricCard
          label="Onboarding Completion"
          value={`${metrics.onboardingRate}%`}
          hint="Invites accepted vs. sent"
          footnote={`${metrics.invitesAccepted} of ${metrics.totalProvisioned} accepted`}
          icon={CheckCircle2}
          accent="amber"
          loading={loading}
        />
        <DashboardMetricCard
          label="Categories Covered"
          value={categoriesCovered}
          hint="Skill categories with a verified claim"
          footnote={
            categoriesCovered === 0 ? 'No categories verified yet' : 'Across the current cohort'
          }
          icon={Layers}
          accent="lavender"
          loading={loading}
        />
      </div>

      <div
        className={`${bentoToolbarClass} flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}
      >
        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--ds-text-secondary)]">
          <Filter className="size-4 text-[var(--ds-text-muted)]" />
          Active report filters
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter report by skill category"
            className={`${selectClass} text-[13px]`}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {SKILL_CATEGORY_IDS.map((categoryId) => (
              <option key={categoryId} value={categoryId}>
                {categoryLabel(categoryId)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter Report by Skills"
            className={`${selectClass} text-[13px]`}
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
          >
            <option value="ALL">All Skills</option>
            {SKILL_DEFINITIONS.map((skill) => (
              <option key={skill.code} value={skill.code}>
                {skill.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter Report by Proficiency"
            className={`${selectClass} text-[13px]`}
            value={proficiencyFilter}
            onChange={(e) => setProficiencyFilter(e.target.value)}
          >
            <option value="ALL">All Proficiencies</option>
            <option value="ADVANCED">{proficiencyLevelUiLabel('ADVANCED')}</option>
            <option value="INTERMEDIATE">{proficiencyLevelUiLabel('INTERMEDIATE')}</option>
            <option value="BEGINNER">{proficiencyLevelUiLabel('BEGINNER')}</option>
          </select>
        </div>
      </div>

      <div className={bentoTableShellClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ds-border-subtle)] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--ds-text)]">
              <Sparkles className="size-4 text-[var(--tpo-dash-accent-lavender)]" />
              Report Table Preview
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--ds-text-muted)]">
              Export format matches the table columns below.
            </p>
          </div>
          <span className={bentoChipClass}>Showing {filteredStudents.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className={`${bentoTableClass} min-w-[720px]`}>
            <thead>
              <tr className={bentoTableHeadRowClass}>
                <th className={bentoTableHeadCellClass}>Candidate</th>
                <th className={bentoTableHeadCellClass}>Email</th>
                <th className={bentoTableHeadCellClass}>Category</th>
                <th className={bentoTableHeadCellClass}>Skills</th>
                <th className={bentoTableHeadCellClass}>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`${bentoTableCellClass} py-10 text-center`}>
                    Loading reports data…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${bentoTableCellClass} py-10 text-center`}>
                    No candidates match the report filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const studentClaims = claims.filter((c) => c.studentId === student.userId);
                  const verifiedCount = studentClaims.filter((c) => c.status === 'VERIFIED').length;
                  const firstClaim = studentClaims[0];
                  const candidateCategory = firstClaim
                    ? categoryNameForSkillCode(firstClaim.skillCode)
                    : categoryLabel('PROGRAMMING_LANGUAGES');
                  const skillsList = studentClaims
                    .map(
                      (c) =>
                        SKILL_DEFINITIONS.find((s) => s.code === c.skillCode)?.name ?? c.skillCode,
                    )
                    .join(', ');
                  return (
                    <tr key={student.userId} className={bentoTableBodyRowClass}>
                      <td className={`${bentoTableCellClass} font-semibold text-[var(--ds-text)]`}>
                        {student.fullName}
                      </td>
                      <td className={bentoTableCellClass}>{student.email}</td>
                      <td className={bentoTableCellClass}>
                        <span className={dashboardPillClass}>{candidateCategory}</span>
                      </td>
                      <td className={`${bentoTableCellClass} max-w-xs truncate`}>
                        {skillsList || 'Enrolled Core Skills'}
                      </td>
                      <td className={bentoTableCellClass}>
                        {verifiedCount > 0 ? (
                          <span className={dashboardMintBadgeClass}>
                            <CheckCircle2 className="size-3" /> {verifiedCount} Verified
                          </span>
                        ) : (
                          <span className={dashboardPendingBadgeClass}>
                            <Clock className="size-3" /> Pending Onboarding
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
