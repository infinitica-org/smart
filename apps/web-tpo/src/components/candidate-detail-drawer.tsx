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
      return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
    case 'LOCKED':
      return 'text-red-400 border-red-500/20 bg-red-500/10';
    case 'BEGINNER_REATTEMPT':
      return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    default:
      return 'text-blue-400 border-blue-500/20 bg-blue-500/10';
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
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0a0a0a] border-l border-white/5 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#131313]">
          <h2 className="text-lg font-semibold text-white">Candidate Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-lg shadow-inner shrink-0">
              {candidate.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{candidate.fullName}</h3>
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {candidate.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-gray-500 mb-1">Batch</p>
              <p className="text-white font-medium">{candidate.batchName ?? 'No batch'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-gray-500 mb-1">Invite status</p>
              <p className="text-white font-medium">{candidate.inviteStatus ?? 'Not invited'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-gray-500 mb-1">Account status</p>
              {candidate.heldAt ? (
                <p className="flex items-center gap-1.5 text-red-400 font-medium">
                  <Ban className="w-3.5 h-3.5" /> On hold
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Active
                </p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-gray-500 mb-1">Accepted</p>
              <p className="text-white font-medium">
                {candidate.acceptedAt
                  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                      new Date(candidate.acceptedAt),
                    )
                  : '—'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Skill verification</h4>
            {loading ? (
              <p className="text-sm text-gray-400">Loading skills…</p>
            ) : error ? (
              <p className="flex items-center gap-1.5 text-sm text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </p>
            ) : !claims || claims.length === 0 ? (
              <p className="text-sm text-gray-400">No skills declared yet.</p>
            ) : (
              <ul className="space-y-2">
                {claims.map((claim) => (
                  <li
                    key={claim.claimId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {skillNameFor(claim.skillCode)}
                      </p>
                      <p className="text-xs text-gray-500">{claim.proficiency}</p>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(claim.status)}`}
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
