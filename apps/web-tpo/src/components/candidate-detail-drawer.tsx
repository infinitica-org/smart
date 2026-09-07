'use client';

import { useEffect, useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import {
  SKILL_DEFINITIONS,
  type InstitutionStudentDto,
  type SkillClaimDto,
  type SkillStream,
} from '@smart/contracts';
import { CandidateProfileCard, type CandidateSkill } from '@smart/ui';
import { api } from '../lib/api';

function skillNameFor(code: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === code)?.name ?? code;
}

function skillStreamFor(code: string): SkillStream | 'UNIVERSAL' {
  return SKILL_DEFINITIONS.find((s) => s.code === code)?.stream ?? 'UNIVERSAL';
}

function streamLabel(stream: string): string {
  switch (stream) {
    case 'SOFTWARE_DEVELOPMENT':
      return 'Software Engineering';
    case 'DATA_SCIENCE_ANALYTICS':
      return 'Data & Analytics';
    case 'AI_ML_ENGINEERING':
      return 'AI & Machine Learning';
    case 'UNIVERSAL':
      return 'Universal Core';
    default:
      return stream.replace(/_/g, ' ');
  }
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

  const firstClaim = claims && claims.length > 0 ? claims[0] : null;
  const primaryStream = firstClaim ? skillStreamFor(firstClaim.skillCode) : 'SOFTWARE_DEVELOPMENT';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[1280px] bg-zinc-950 border-l border-zinc-800 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col font-sans text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400" />
              Candidate Profile View
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700"
            aria-label="Close Profile View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read-Only Banner */}
        <div className="bg-zinc-900/80 border-b border-zinc-800 px-6 py-3 text-xs text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-400" />
            <span>
              <strong className="text-white">Observational Data Only:</strong> Candidate stream
              choices and skill verifications are managed autonomously. TPO views are strictly
              read-only.
            </span>
          </div>
        </div>

        {/* Profile Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Metadata Card: Stream, Onboarding, Verification Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/80 p-5 rounded-xl border border-zinc-800">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Candidate-Selected Stream
              </span>
              <span className="text-xs font-extrabold text-white bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-md inline-block">
                {streamLabel(primaryStream)}
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Chosen by candidate during onboarding
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Onboarding Progress
              </span>
              {candidate.inviteStatus === 'ACCEPTED' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="size-3.5" /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">
                  <Clock className="size-3.5" /> Invite Sent / Pending
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Skill Credentials
              </span>
              <span className="text-xs font-extrabold text-white">
                {claims
                  ? `${claims.filter((c) => c.status === 'VERIFIED').length} Verified / ${claims.length} Claims`
                  : 'Loading...'}
              </span>
            </div>
          </div>

          <CandidateProfileCard
            candidateId={candidate.userId}
            displayName={candidate.fullName}
            trackName={candidate.batchName || streamLabel(primaryStream)}
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
