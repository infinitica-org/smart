'use client';

import { useEffect, useState } from 'react';
import { X, Mail, Ban, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import {
  SKILL_DEFINITIONS,
  type InstitutionStudentDto,
  type SkillClaimDto,
} from '@smart/contracts';
import { api } from '../lib/api';

function skillNameFor(code: string): string {
  return SKILL_DEFINITIONS.find((s) => s.code === code)?.name ?? code;
}

function statusTone(status: SkillClaimDto['status']): string {
  switch (status) {
    case 'VERIFIED':
      return 'text-emerald-700 border-emerald-200 bg-emerald-50';
    case 'LOCKED':
      return 'text-rose-700 border-rose-200 bg-rose-50';
    case 'BEGINNER_REATTEMPT':
      return 'text-amber-700 border-amber-200 bg-amber-50';
    default:
      return 'text-sky-700 border-sky-200 bg-sky-50';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-slate-200/80 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/80 bg-slate-50/80">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Candidate Profile</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Read-only institutional candidate profile telemetry
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors bg-white border border-slate-200/80 rounded-full shadow-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 bg-[#F0FDFA]/60 border border-[#CCFBF1] p-4 rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-[#004C63] text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-xs">
              {candidate.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{candidate.fullName}</h3>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                <Mail className="w-3.5 h-3.5 text-[#004C63]" /> {candidate.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-sm">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                Batch
              </p>
              <p className="text-slate-900 font-bold">{candidate.batchName ?? 'No batch'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                Invite status
              </p>
              <p className="text-slate-900 font-bold">{candidate.inviteStatus ?? 'Not invited'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                Account status
              </p>
              {candidate.heldAt ? (
                <p className="flex items-center gap-1.5 text-rose-600 font-bold">
                  <Ban className="w-3.5 h-3.5" /> On hold
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Active
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                Accepted
              </p>
              <p className="text-slate-900 font-bold">
                {candidate.acceptedAt
                  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                      new Date(candidate.acceptedAt),
                    )
                  : '—'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3">Skill verification</h4>
            {loading ? (
              <p className="text-sm text-slate-500 font-medium">Loading skills…</p>
            ) : error ? (
              <p className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </p>
            ) : !claims || claims.length === 0 ? (
              <p className="text-sm text-slate-500 font-medium">No skills declared yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {claims.map((claim) => (
                  <li
                    key={claim.claimId}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3.5"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {skillNameFor(claim.skillCode)}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">{claim.proficiency}</p>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusTone(claim.status)}`}
                    >
                      {claim.status === 'VERIFIED' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {claim.status.replaceAll('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
