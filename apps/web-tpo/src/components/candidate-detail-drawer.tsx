'use client';

import { useEffect, useState } from 'react';
import { X, ShieldCheck, Info } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { api } from '../lib/api';
import { CandidateRepositoryProfileView } from './candidates/CandidateRepositoryProfileView';
import { bentoThemeClass } from '../lib/tpo-dashboard-ui';

export function CandidateDetailDrawer({
  candidate,
  isOpen,
  onClose,
}: {
  candidate: InstitutionStudentDto | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [claims, setClaims] = useState<SkillClaimDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !candidate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setClaims(null);
    api.assessment
      .listSkillClaims()
      .then((all) => {
        if (!cancelled) {
          setClaims(all.filter((c) => c.studentId === candidate.userId));
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(isSmartApiError(caught) ? caught.message : 'Could not load skill claims.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, candidate]);

  if (!isOpen || !candidate) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#101828]/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={`${bentoThemeClass} fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-[var(--ds-border)] bg-[var(--ds-canvas)] shadow-[0_8px_30px_rgba(15,23,42,0.12)] animate-in slide-in-from-right duration-300 lg:max-w-3xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-profile-drawer-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ds-border)] bg-[var(--ds-surface)] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-[var(--ds-green)]" aria-hidden />
            <h2
              id="candidate-profile-drawer-title"
              className="truncate text-[13px] font-semibold text-[var(--ds-text)]"
            >
              Candidate profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-1.5 text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]"
            aria-label="Close profile"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-start gap-2 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-5 py-2.5 text-[12px] leading-relaxed text-[var(--ds-text-muted)]">
          <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--ds-text-subtle)]" aria-hidden />
          <p>
            Read-only view for your institution. Skill claims and verification outcomes come from
            the assessment service; contact and batch fields come from onboarding records.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CandidateRepositoryProfileView
            candidate={candidate}
            claims={claims}
            claimsLoading={loading}
            claimsError={error}
          />
        </div>
      </div>
    </>
  );
}
