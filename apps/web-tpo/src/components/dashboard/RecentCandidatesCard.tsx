import Link from 'next/link';
import { ArrowRight, MoreHorizontal } from 'lucide-react';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { categoryLabel, categoryNameForSkillCode } from '../../lib/skill-taxonomy';
import {
  bentoCardClass,
  dashboardHomeEvalBadgeClass,
  dashboardHomePendingBadgeClass,
  dashboardHomeSuccessBadgeClass,
  dashboardHomeTableRowClass,
  dashboardPillClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';

type RecentCandidatesCardProps = {
  students: InstitutionStudentDto[];
  claims: SkillClaimDto[];
  loading: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '?';
  if (parts.length === 1) return first.charAt(0).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function RecentCandidatesCard({ students, claims, loading }: RecentCandidatesCardProps) {
  const preview = students.slice(0, 5);

  return (
    <section className={`${bentoCardClass} lg:col-span-12`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={dashboardSectionTitleClass}>Recent Candidates</h2>
          <p className={dashboardSectionSubtitleClass}>
            Latest onboarded candidates on the platform
          </p>
        </div>
        <Link
          href="/students"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ds-text-secondary)] transition-colors duration-200 hover:text-[var(--ds-text)]"
        >
          View all <ArrowRight className="size-3.5" strokeWidth={1.5} />
        </Link>
      </div>

      {loading ? (
        <div className={`${dashboardSkeletonClass} mt-5 h-48 w-full rounded-2xl`} />
      ) : preview.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-[var(--ds-text)]">
            No candidates onboarded yet
          </p>
          <p className="mt-1 text-[13px] text-[var(--ds-text-muted)]">
            Onboard candidates to start building your cohort.
          </p>
          <Link
            href="/whitelist"
            className="mt-4 inline-flex text-[13px] font-semibold text-[var(--ds-link)]"
          >
            Go to onboarding
          </Link>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--tpo-dash-table-border,#e8edf3)]">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--tpo-dash-table-border,#e8edf3)] bg-[var(--tpo-dash-table-head,#f8fafc)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                <th className="px-3 py-3 font-semibold">Candidate</th>
                <th className="px-3 py-3 font-semibold">Primary Skill</th>
                <th className="px-3 py-3 font-semibold">Onboarding</th>
                <th className="px-3 py-3 font-semibold">Verified Skills</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((student) => {
                const studentClaims = claims.filter((c) => c.studentId === student.userId);
                const verifiedClaims = studentClaims.filter((c) => c.status === 'VERIFIED');
                const firstClaim = studentClaims[0];
                const candidateCategory = firstClaim
                  ? categoryNameForSkillCode(firstClaim.skillCode)
                  : categoryLabel('PROGRAMMING_LANGUAGES');

                return (
                  <tr key={student.userId} className={dashboardHomeTableRowClass}>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--tpo-dash-avatar-bg,#eef2f6)] text-[11px] font-semibold text-[var(--ds-text-secondary)]">
                          {initials(student.fullName)}
                        </span>
                        <div>
                          <div className="font-semibold text-[var(--ds-text)]">
                            {student.fullName}
                          </div>
                          <div className="text-[12px] text-[var(--ds-text-muted)]">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={dashboardPillClass}>{candidateCategory}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      {student.inviteStatus === 'ACCEPTED' ? (
                        <span className={dashboardHomeSuccessBadgeClass}>Completed</span>
                      ) : (
                        <span className={dashboardHomePendingBadgeClass}>Pending invitation</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 font-medium tabular-nums text-[var(--ds-text)]">
                      {verifiedClaims.length}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={dashboardHomeEvalBadgeClass}>Autonomous Evaluation</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        href={`/students?q=${encodeURIComponent(student.fullName)}`}
                        className="inline-flex rounded-lg p-1.5 text-[var(--ds-text-muted)] transition-colors duration-200 hover:bg-[#f8fafc] hover:text-[var(--ds-text)]"
                        aria-label={`View ${student.fullName}`}
                      >
                        <MoreHorizontal className="size-4" strokeWidth={1.5} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
