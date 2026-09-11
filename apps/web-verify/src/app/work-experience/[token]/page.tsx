'use client';

import { useState, useEffect, use } from 'react';
import type {
  EmployerVerificationDecision,
  GetWorkExperienceVerificationResponseDto,
} from '@smart/contracts';
import { api } from '@/lib/api';

interface PageProps {
  params: Promise<{ token: string }>;
}

const DECISION_OPTIONS: Array<{
  decision: EmployerVerificationDecision;
  label: string;
  description: string;
  tone: 'emerald' | 'red' | 'amber' | 'blue';
}> = [
  {
    decision: 'YES',
    label: 'Confirm fully',
    description: 'Employment details are accurate as stated.',
    tone: 'emerald',
  },
  {
    decision: 'NO',
    label: 'Cannot confirm',
    description: 'I cannot confirm this employment claim.',
    tone: 'red',
  },
  {
    decision: 'PARTIAL',
    label: 'Partially confirm',
    description: 'Most details match with minor differences.',
    tone: 'amber',
  },
  {
    decision: 'NEED_CLARIFICATION',
    label: 'Need clarification',
    description: 'Additional information is required from the candidate.',
    tone: 'blue',
  },
];

function statusAfterDecision(
  decision: EmployerVerificationDecision,
): GetWorkExperienceVerificationResponseDto['status'] {
  if (decision === 'YES' || decision === 'PARTIAL') return 'VERIFIED';
  if (decision === 'NEED_CLARIFICATION') return 'SUBMITTED';
  return 'REJECTED';
}

export default function WorkExperienceVerificationPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GetWorkExperienceVerificationResponseDto | null>(null);

  const [selectedDecision, setSelectedDecision] = useState<EmployerVerificationDecision | null>(
    null,
  );
  const [comments, setComments] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerification() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.users.getWorkExperienceVerificationByToken(token);
        setData(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load verification details.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadVerification();
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedDecision) {
      setError('Select a verification decision before submitting.');
      return;
    }
    if (
      (selectedDecision === 'PARTIAL' || selectedDecision === 'NEED_CLARIFICATION') &&
      comments.trim().length < 8
    ) {
      setError(
        'Comments of at least 8 characters are required for partial or clarification responses.',
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const responseJson = await api.users.submitWorkExperienceVerificationByToken(token, {
        decision: selectedDecision,
        comments: comments.trim() || undefined,
      });

      setSubmitSuccess(responseJson.message);
      if (data) {
        setData({
          ...data,
          status: responseJson.status ?? statusAfterDecision(selectedDecision),
          isAlreadyResponded: true,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error submitting response.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#00fad0] border-t-transparent" />
        <p className="mt-3 text-sm text-white/60">Loading verification details...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <h2 className="mt-3 text-lg font-semibold text-white">Verification Link Invalid</h2>
          <p className="mt-2 text-sm text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-2xl py-8 px-4 animate-fade-in flex flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-xl bg-[#00fad0]/10 p-3 text-[#00fad0]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Work Experience Verification Request</h1>
            <p className="text-xs text-white/50">SMART Verified Credentials System</p>
          </div>
        </div>

        {submitSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-sm font-medium text-emerald-300">
            {submitSuccess}
          </div>
        )}

        {data.isAlreadyResponded && !submitSuccess && (
          <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/15 p-4 text-sm text-blue-300">
            Response already recorded: Status is{' '}
            <strong className="font-bold text-white">{data.status}</strong>.
          </div>
        )}

        {data.isExpired && !data.isAlreadyResponded && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/15 p-4 text-sm text-amber-300">
            This verification invitation link has expired.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Claim to verify</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Candidate identity
              </span>
              <p className="mt-1 text-base font-semibold text-white">{data.candidateName}</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Company / employer
              </span>
              <p className="mt-1 text-base font-semibold text-white">{data.companyName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Role / title
              </span>
              <p className="mt-1 text-sm font-semibold text-white">{data.role}</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Employment type
              </span>
              <p className="mt-1 text-sm font-semibold text-white">{data.employmentType}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Employment dates
            </span>
            <p className="mt-1 text-sm font-medium text-white">
              {data.startDate} — {data.isCurrent ? 'Present' : data.endDate || 'N/A'}
            </p>
          </div>

          {data.responsibilities && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Stated responsibilities / domain context
              </span>
              <p className="mt-2 text-xs text-white/80 leading-relaxed whitespace-pre-line">
                {data.responsibilities}
              </p>
            </div>
          )}

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 text-xs text-white/60">
            Verifier:{' '}
            <strong className="text-white/90">
              {data.verifierName ? `${data.verifierName} · ` : ''}
              {data.verifierEmail}
            </strong>
            {data.verifierDesignation ? ` (${data.verifierDesignation})` : null}
          </div>
        </div>

        {!data.isAlreadyResponded && !data.isExpired && (
          <div className="mt-6 border-t border-white/10 pt-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Structured verification decision</h3>
            <p className="text-xs text-white/60">
              Confirm identity, employer, dates, employment type, and role details for{' '}
              {data.candidateName} at {data.companyName}.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DECISION_OPTIONS.map((option) => {
                const selected = selectedDecision === option.decision;
                return (
                  <button
                    key={option.decision}
                    type="button"
                    onClick={() => setSelectedDecision(option.decision)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? 'border-[#00fad0]/50 bg-[#00fad0]/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-xs text-white/60">{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Comments{' '}
                {selectedDecision === 'PARTIAL' || selectedDecision === 'NEED_CLARIFICATION'
                  ? '(required, min 8 characters)'
                  : '(optional)'}
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add verification notes or clarification details..."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-[#00fad0] focus:outline-none"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedDecision}
              className="w-full rounded-xl bg-[#00fad0] px-4 py-3 text-sm font-semibold text-black hover:bg-[#00e0ba] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit verification response'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
