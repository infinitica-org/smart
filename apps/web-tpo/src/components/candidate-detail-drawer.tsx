'use client';

import { useEffect, useState } from 'react';
import { X, ShieldCheck, Info, User } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { InstitutionStudentDto, SkillClaimDto } from '@smart/contracts';
import { api } from '../lib/api';
import { CandidateRepositoryProfileView } from './candidates/CandidateRepositoryProfileView';
import { CandidateEvidenceReviewPanel } from './candidates/CandidateEvidenceReviewPanel';

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
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Candidate details for ${candidate.fullName}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-zinc-200/80 bg-white shadow-2xl transition-transform duration-300 animate-in slide-in-from-right"
      >
        {/* Drawer Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/80 px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 shadow-2xs">
              <User className="size-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 leading-tight">
                {candidate.fullName}
              </h2>
              <p className="text-[11px] text-zinc-500">{candidate.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-500 shadow-2xs transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close profile"
          >
            <X className="size-4 stroke-[2]" />
          </button>
        </div>

        {/* Read-only notice */}
        <div className="flex shrink-0 items-start gap-2.5 border-b border-zinc-200/60 bg-zinc-100/70 px-6 py-2.5 text-xs leading-relaxed text-zinc-500">
          <Info className="mt-0.5 size-3.5 shrink-0 text-zinc-400" aria-hidden />
          <p>
            Read-only view for your institution. Skill claims and verification outcomes come from
            the assessment service; contact and batch fields come from onboarding records.
          </p>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <CandidateRepositoryProfileView
            candidate={candidate}
            claims={claims}
            claimsLoading={loading}
            claimsError={error}
          />
          <CandidateEvidenceReviewPanel studentId={candidate.userId} />
        </div>
      </div>
    </>
  );
}
