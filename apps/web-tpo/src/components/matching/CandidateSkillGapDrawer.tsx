'use client';

import { X, BarChart3 } from 'lucide-react';
import type { CandidateMatchDto } from '@smart/contracts';
import { bentoThemeClass } from '../../lib/tpo-dashboard-ui';
import { CandidateSkillGapPanel } from './CandidateSkillGapPanel';

export function CandidateSkillGapDrawer({
  candidate,
  roleTitle,
  companyName,
  isOpen,
  onClose,
}: {
  candidate: CandidateMatchDto | null;
  roleTitle: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !candidate) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#101828]/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={`${bentoThemeClass} fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[var(--ds-border)] bg-[var(--ds-canvas)] shadow-[0_8px_30px_rgba(15,23,42,0.12)] animate-in slide-in-from-right duration-300 lg:max-w-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-skill-gap-drawer-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ds-border)] bg-[var(--ds-surface)] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="size-4 shrink-0 text-[var(--ds-green)]" aria-hidden />
            <div className="min-w-0">
              <h2
                id="candidate-skill-gap-drawer-title"
                className="truncate text-[13px] font-semibold text-[var(--ds-text)]"
              >
                Skill gap — {candidate.studentName}
              </h2>
              <p className="truncate text-[11px] text-[var(--ds-text-muted)]">
                {roleTitle} · {companyName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-1.5 text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]"
            aria-label="Close skill gap"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CandidateSkillGapPanel candidate={candidate} roleTitle={roleTitle} variant="drawer" />
        </div>
      </div>
    </>
  );
}
