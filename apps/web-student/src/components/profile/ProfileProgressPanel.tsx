'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { PROFILE_AREA_IDS, PROFILE_AREA_LABELS, type ProfileAreaId } from '@/lib/profile-progress';

interface ProfileProgressPanelProps {
  percent: number | null;
  areaStatus: Record<ProfileAreaId, boolean> | null;
  loading?: boolean;
  showChecklist?: boolean;
}

export function ProfileProgressPanel({
  percent,
  areaStatus,
  loading = false,
  showChecklist = true,
}: ProfileProgressPanelProps) {
  const safePercent = percent ?? 0;

  return (
    <section
      aria-label="Your SMART Profile"
      className="rounded-[28px] border border-white/10 bg-[#1a1a1a] p-6 md:p-7"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00fad0]">
            Your SMART Profile
          </p>
          <h2 className="mt-1 text-xl font-medium text-white md:text-2xl">
            {loading ? 'Loading profile progress…' : `${safePercent}% complete`}
          </h2>
        </div>
        {!loading ? (
          <p className="text-sm text-white/45">
            Profile completion shows useful information SMART has.
          </p>
        ) : null}
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safePercent}
        aria-label="Profile completion"
      >
        <div
          className="h-full rounded-full bg-[#00fad0] transition-[width] duration-500"
          style={{ width: `${String(safePercent)}%` }}
        />
      </div>

      {showChecklist && areaStatus ? (
        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROFILE_AREA_IDS.map((areaId) => {
            const complete = areaStatus[areaId];
            return (
              <li key={areaId} className="flex items-center gap-2 text-sm text-white/75">
                {complete ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00fad0]" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-white/25" aria-hidden="true" />
                )}
                <span>{PROFILE_AREA_LABELS[areaId]}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
