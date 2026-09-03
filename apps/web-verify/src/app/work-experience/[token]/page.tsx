'use client';

import { useState, useEffect, use } from 'react';
import type { GetWorkExperienceVerificationResponseDto } from '@smart/contracts';
import { api } from '@/lib/api';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function WorkExperienceVerificationPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GetWorkExperienceVerificationResponseDto | null>(null);

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

  const handleSubmit = async (approved: boolean) => {
    try {
      setSubmitting(true);
      setError(null);

      const responseJson = await api.users.submitWorkExperienceVerificationByToken(token, {
        approved,
        comments: comments.trim() || undefined,
      });

      setSubmitSuccess(responseJson.message);
      if (data) {
        setData({
          ...data,
          status: approved ? 'VERIFIED' : 'REJECTED',
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
          <svg
            className="mx-auto h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-3 text-lg font-semibold text-white">Verification Link Invalid</h2>
          <p className="mt-2 text-sm text-red-300">{error}</p>
          <p className="mt-4 text-xs text-white/40">
            This verification link may have expired or already been processed.
          </p>
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
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-sm font-medium text-emerald-300">
            <svg
              className="h-5 w-5 shrink-0 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{submitSuccess}</span>
          </div>
        )}

        {data.isAlreadyResponded && !submitSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/15 p-4 text-sm text-blue-300">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Response already recorded: Status is{' '}
              <strong className="font-bold text-white">{data.status}</strong>.
            </span>
          </div>
        )}

        {data.isExpired && !data.isAlreadyResponded && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 p-4 text-sm text-amber-300">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>This verification invitation link has expired.</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Candidate
              </span>
              <p className="mt-1 text-base font-semibold text-white">{data.candidateName}</p>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Employer
              </span>
              <p className="mt-1 text-base font-semibold text-white">{data.companyName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Role Title
              </span>
              <p className="mt-1 text-sm font-semibold text-white">
                {data.role} ({data.employmentType})
              </p>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Tenure
              </span>
              <p className="mt-1 text-sm font-medium text-white">
                {data.startDate} — {data.isCurrent ? 'Present' : data.endDate || 'N/A'}
              </p>
            </div>
          </div>

          {data.responsibilities && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Stated Responsibilities
              </span>
              <p className="mt-2 text-xs text-white/80 leading-relaxed whitespace-pre-line">
                {data.responsibilities}
              </p>
            </div>
          )}

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 text-xs text-white/60">
            Verifier Email: <strong className="text-white/90">{data.verifierEmail}</strong>
          </div>
        </div>

        {!data.isAlreadyResponded && !data.isExpired && (
          <div className="mt-6 border-t border-white/10 pt-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Verifier Decision</h3>
            <p className="text-xs text-white/60">
              Please confirm whether the candidate details above accurately represent their
              employment at {data.companyName}.
            </p>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Optional Comments / Feedback
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add optional comments or verification details..."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-[#00fad0] focus:outline-none"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="w-full sm:w-1/2 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  <>Approve Work Experience</>
                )}
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="w-full sm:w-1/2 flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-transparent" />
                ) : (
                  <>Reject Work Experience</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
