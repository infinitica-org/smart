'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import {
  SKILL_DEFINITIONS,
  type InstitutionStudentDto,
  type SkillClaimDto,
} from '@smart/contracts';
import { CandidateProfileCard, type CandidateSkill } from '@smart/ui';
import { api } from '../lib/api';

function skillNameFor(code: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === code)?.name ?? code;
}

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
  const [, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !candidate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.assessment
      .listSkillClaims()
      .then((all) => {
        if (!cancelled) setClaims(all.filter((c) => c.studentId === candidate.userId));
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(isSmartApiError(caught) ? caught.message : 'Could not load skills.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, candidate]);

  if (!isOpen || !candidate) return null;

  const candidateSkills: CandidateSkill[] = (claims || []).map((claim) => ({
    name: skillNameFor(claim.skillCode),
    status: claim.status,
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Full-width Dashboard Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[1440px] bg-[#080909] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#111516] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white tracking-wide uppercase">
              Candidate Profile View
            </h2>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-3xs font-semibold px-2 py-0.5 rounded-full">
              Read-Only
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full border border-white/10"
            aria-label="Close Profile View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#080909]">
          <CandidateProfileCard
            candidateId={candidate.userId}
            displayName={candidate.fullName}
            trackName={candidate.batchName || 'Software Engineering'}
            headlineTier="GOLD"
            skills={candidateSkills}
            contactInfo={{
              email: candidate.email,
            }}
            academicDetails={{
              batchName: candidate.batchName ?? undefined,
            }}
          />
        </div>
      </div>
    </>
  );
}
