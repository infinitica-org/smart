'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Circle,
  FolderKanban,
  GraduationCap,
  Languages,
  Link2,
  Shield,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  DASHBOARD_AREA_LABELS,
  PROFILE_AREA_HREFS,
  PROFILE_AREA_IDS,
  PROFILE_AREA_LABELS,
  PROFILE_VERIFICATION_UNLOCK_MESSAGE,
  type ProfileAreaId,
} from '@/lib/profile-progress';

const DASHBOARD_AREA_ICONS: Record<ProfileAreaId, LucideIcon> = {
  skills: UserRound,
  languages: Languages,
  education: GraduationCap,
  experience: Briefcase,
  projects: FolderKanban,
  certifications: Shield,
  professionalLinks: Link2,
};

interface ProfileProgressPanelProps {
  percent: number | null;
  areaStatus: Record<ProfileAreaId, boolean> | null;
  loading?: boolean;
  showChecklist?: boolean;
  variant?: 'default' | 'dashboard';
}

export function ProfileProgressPanel({
  percent,
  areaStatus,
  loading = false,
  showChecklist = true,
  variant = 'default',
}: ProfileProgressPanelProps) {
  const safePercent = percent ?? 0;
  const completedCount = areaStatus ? PROFILE_AREA_IDS.filter((id) => areaStatus[id]).length : 0;
  const isDashboard = variant === 'dashboard';
  const labels = isDashboard ? DASHBOARD_AREA_LABELS : PROFILE_AREA_LABELS;

  const shellClass = isDashboard
    ? 'rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6 shadow-[var(--ds-card-shadow)]'
    : 'surface-panel rounded-2xl p-6 md:p-7';

  return (
    <section aria-label="Your SMART Profile" className={shellClass}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {isDashboard ? (
            <>
              <h2 className="text-lg font-semibold text-[var(--ds-text)]">Profile Sections</h2>
              <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
                {PROFILE_VERIFICATION_UNLOCK_MESSAGE}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Your SMART Profile
              </p>
              <h2 className="mt-1 text-xl font-medium text-foreground md:text-2xl">
                {loading ? 'Loading profile progress…' : `${safePercent}% complete`}
              </h2>
            </>
          )}
        </div>
        {!loading && isDashboard && areaStatus ? (
          <Link
            href="/profile"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--ds-text-secondary)] transition hover:text-[var(--ds-text)]"
          >
            {completedCount} of {PROFILE_AREA_IDS.length} sections complete
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : !loading && !isDashboard ? (
          <p className="text-sm text-muted-foreground">
            Profile completion shows useful information SMART has.
          </p>
        ) : null}
      </div>

      {!isDashboard ? (
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safePercent}
          aria-label="Profile completion"
        >
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-500"
            style={{ width: `${String(safePercent)}%` }}
          />
        </div>
      ) : null}

      {showChecklist && areaStatus ? (
        <ul
          className={
            isDashboard
              ? 'mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
              : 'mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2'
          }
        >
          {PROFILE_AREA_IDS.map((areaId) => {
            const complete = areaStatus[areaId];
            const href = PROFILE_AREA_HREFS[areaId];
            const Icon = DASHBOARD_AREA_ICONS[areaId];
            if (isDashboard) {
              return (
                <li key={areaId}>
                  {complete ? (
                    <div className="flex h-[5.25rem] items-center gap-3 rounded-[10px] border border-[var(--ds-border-inner)] bg-[var(--ds-surface)] px-3 py-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ds-green-soft)]">
                        <Icon className="h-4 w-4 text-[var(--ds-green)]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ds-text)]">
                          {labels[areaId]}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[var(--ds-green-status)]">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Completed
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={href}
                      className="flex h-[5.25rem] items-center gap-3 rounded-[10px] border border-[var(--ds-border-inner)] bg-[var(--ds-surface)] px-3 py-2 transition hover:border-[var(--ds-border)] hover:bg-[var(--ds-surface-hover)]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ds-surface-muted)]">
                        <Icon className="h-4 w-4 text-[var(--ds-icon)]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--ds-text)]">
                          {labels[areaId]}
                        </p>
                        <p className="mt-0.5 text-[13px] font-medium text-[var(--ds-link)]">
                          Add details
                        </p>
                      </div>
                    </Link>
                  )}
                </li>
              );
            }
            return (
              <li key={areaId} className="flex items-center gap-2 text-sm text-foreground/85">
                {complete ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
                ) : (
                  <Circle
                    className="h-4 w-4 shrink-0 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                )}
                <span>{labels[areaId]}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
