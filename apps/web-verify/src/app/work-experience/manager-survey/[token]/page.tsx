'use client';

import { useState, useEffect, use } from 'react';
import type { GetManagerEndorsementSurveyDto } from '@smart/contracts';
import { api } from '@/lib/api';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function ManagerSurveyPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GetManagerEndorsementSurveyDto | null>(null);

  // Form state
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadSurvey() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.users.getWorkExperienceManagerEndorsementByToken(token);
        setData(result);

        // Initialize skill ratings to 5 by default
        if (result.skillsClaimed && result.skillsClaimed.length > 0) {
          const initial: Record<string, number> = {};
          result.skillsClaimed.forEach((skill) => {
            initial[skill] = 5;
          });
          setSkillRatings(initial);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load manager endorsement survey.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadSurvey();
    }
  }, [token]);

  const handleRatingChange = (skillCode: string, rating: number) => {
    setSkillRatings((prev) => ({
      ...prev,
      [skillCode]: rating,
    }));
  };

  const handleSubmit = async (confirmed: boolean) => {
    try {
      setSubmitting(true);
      setError(null);

      const ratingsArray = data?.skillsClaimed?.map((skillCode) => ({
        skillCode,
        rating: skillRatings[skillCode] ?? 5,
      }));

      const responseJson = await api.users.submitWorkExperienceManagerEndorsementByToken(token, {
        confirmed,
        skillRatings: confirmed && ratingsArray?.length ? ratingsArray : undefined,
        comments: comments.trim() || undefined,
      });

      setSubmitSuccess(responseJson.message);
      if (data) {
        setData({
          ...data,
          status: confirmed ? 'CONFIRMED' : 'DISPUTED',
          isAlreadyResponded: true,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error submitting endorsement.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#14b8a6] border-t-transparent" />
        <p className="mt-3 text-sm text-white/60">Loading manager endorsement survey...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center backdrop-blur-md">
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
          <h2 className="mt-3 text-lg font-semibold text-white">Endorsement Link Invalid</h2>
          <p className="mt-2 text-sm text-red-300">{error}</p>
          <p className="mt-4 text-xs text-white/40">
            This manager endorsement link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-2xl py-8 px-4 animate-fade-in flex flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="rounded-xl bg-[#14b8a6]/10 p-3 text-[#14b8a6]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Manager Endorsement Request</h1>
            <p className="text-xs text-white/50">SMART Profile Calibration & Verification</p>
          </div>
        </div>

        {/* Success Banner */}
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

        {/* Already Responded Banner */}
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
              Endorsement recorded: Status is{' '}
              <strong className="font-bold text-white uppercase">{data.status}</strong>.
            </span>
          </div>
        )}

        {/* Expired Link Banner */}
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
            <span>This manager endorsement magic link has expired.</span>
          </div>
        )}

        {/* Details Grid — read-only work experience claim from candidate profile */}
        <div className="mt-6 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Work experience claim</h2>
            <p className="mt-1 text-xs text-white/50">
              The role, employment dates, and responsibilities below are shown as the candidate
              reported them. Review these details before confirming or disputing.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Candidate Name
              </span>
              <p className="mt-1 text-base font-semibold text-white">{data.candidateName}</p>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Employer / Organization
              </span>
              <p className="mt-1 text-base font-semibold text-white">{data.companyName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Role & Employment Type
              </span>
              <p className="mt-1 text-sm font-semibold text-white">
                {data.role} ({data.employmentType})
              </p>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Tenure Period
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
            Manager Email: <strong className="text-white/90">{data.managerEmail}</strong>
            {data.managerName && <span className="ml-2">({data.managerName})</span>}
          </div>
        </div>

        {/* Survey Form (when active, not expired, not responded) */}
        {!data.isAlreadyResponded && !data.isExpired && (
          <div className="mt-6 border-t border-white/10 pt-6 flex flex-col gap-6">
            <h3 className="text-sm font-semibold text-white">Manager Endorsement Survey</h3>

            {/* Claimed Skills Ratings */}
            {data.skillsClaimed && data.skillsClaimed.length > 0 && (
              <div className="flex flex-col gap-3">
                <label className="block text-xs font-medium text-white/80">
                  Rate Candidate&apos;s Demonstrated Skills (1 = Basic, 5 = Exceptional)
                </label>
                <div className="flex flex-col gap-3">
                  {data.skillsClaimed.map((skillCode) => (
                    <div
                      key={skillCode}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3 gap-2"
                    >
                      <span className="text-xs font-mono font-medium text-[#14b8a6]">
                        {skillCode}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(skillCode, star)}
                            className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                              (skillRatings[skillCode] ?? 5) >= star
                                ? 'bg-[#14b8a6]/20 text-[#14b8a6] border border-[#14b8a6]/40'
                                : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10'
                            }`}
                          >
                            {star}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Comments */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Optional Manager Comments / Feedback
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add comments regarding candidate performance, leadership, or endorsement context..."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-white/30 focus:border-[#14b8a6] focus:outline-none"
              />
            </div>

            <div
              className="rounded-xl border border-[#14b8a6]/20 bg-[#14b8a6]/5 p-4 text-xs text-white/80 leading-relaxed"
              aria-live="polite"
            >
              <p className="font-medium text-white/90">What confirmation means</p>
              <p className="mt-1">
                Selecting <strong className="text-white">Confirm &amp; Endorse Claim</strong>{' '}
                verifies that the role, employment dates, and responsibilities shown above
                accurately represent this experience.
              </p>
            </div>

            {error && (
              <div className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="w-full sm:w-1/2 flex items-center justify-center gap-2 rounded-xl bg-[#14b8a6] px-4 py-3 text-sm font-semibold text-black hover:bg-[#0d9488] disabled:opacity-50 transition-colors shadow-lg shadow-[#14b8a6]/10"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  <>Confirm & Endorse Claim</>
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
                  <>Dispute Experience Claim</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
