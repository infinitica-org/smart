'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import type { ProjectDefenseOutcomeDto } from '@smart/contracts';

interface OutcomePageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectDefenseOutcomePage({ params }: OutcomePageProps) {
  const { projectId } = use(params);
  const [outcome, setOutcome] = useState<ProjectDefenseOutcomeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);

  useEffect(() => {
    async function loadOutcome() {
      try {
        setLoading(true);
        const data = await api.projects.defenseOutcome(projectId);
        setOutcome(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load defense outcome.');
      } finally {
        setLoading(false);
      }
    }
    loadOutcome();
  }, [projectId]);

  async function handleAppeal() {
    if (appealReason.trim().length < 8) return;
    try {
      setSubmittingAppeal(true);
      await api.projects.appealDefense(projectId, { reason: appealReason.trim() });
      setAppealSuccess(true);
      setShowAppealForm(false);
      const updated = await api.projects.defenseOutcome(projectId);
      setOutcome(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit appeal.');
    } finally {
      setSubmittingAppeal(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-10 px-4">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    );
  }

  if (error || !outcome) {
    return (
      <div className="mx-auto max-w-3xl py-12 px-4 text-center">
        <XCircle className="mx-auto size-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Outcome Not Available</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {error ?? 'Defense session outcome could not be retrieved.'}
        </p>
        <Link
          href="/interviews"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          <ArrowLeft className="size-4" /> Back to Interviews
        </Link>
      </div>
    );
  }

  const grade = outcome.grade;
  const isVerified = outcome.projectStatus === 'VERIFIED';
  const isUnderReview = outcome.projectStatus === 'UNDER_REVIEW';

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8 px-4 font-sans">
      <div className="flex items-center justify-between">
        <Link
          href="/interviews"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" /> Back to Interviews
        </Link>
        <span className="text-xs text-zinc-500">
          Interview Status:{' '}
          <strong className="text-zinc-800 dark:text-zinc-200">{outcome.interviewStatus}</strong>
        </span>
      </div>

      {/* Main Score Header Card */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#161616]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-xl font-bold text-zinc-950 dark:text-white">
                Project Defense Outcome
              </h1>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="size-3.5" /> Verified
                </span>
              )}
              {isUnderReview && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="size-3.5" /> Under Human Review
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Completed on{' '}
              {outcome.interviewCompletedAt
                ? new Date(outcome.interviewCompletedAt).toLocaleDateString()
                : 'Recently'}
            </p>
          </div>

          {grade && (
            <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800 shrink-0">
              <Award className="size-8 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Overall Score
                </span>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {grade.defenseScore}
                  <span className="text-sm font-normal text-zinc-400">/100</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Competency Dimensions */}
        {grade && (
          <div className="mt-6 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Evaluation Dimensions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-xs text-zinc-500 block">Depth of Understanding</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {grade.dimensions.depthOfUnderstanding}%
                </span>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-xs text-zinc-500 block">Ownership & Originality</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {grade.dimensions.ownershipAndOriginality}%
                </span>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-xs text-zinc-500 block">Defense Quality</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {grade.dimensions.defenseQuality}%
                </span>
              </div>
            </div>

            {/* Demonstrated vs Inferred Claims */}
            {grade.demonstratedClaims?.length || grade.inferredClaims?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {grade.demonstratedClaims?.length ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block mb-2">
                      ✓ Demonstrated Capabilities
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                      {grade.demonstratedClaims.map((claim, idx) => (
                        <li key={idx}>{claim}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {grade.inferredClaims?.length ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-2">
                      ℹ Inferred Competencies
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {grade.inferredClaims.map((claim, idx) => (
                        <li key={idx}>{claim}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Justification summary */}
            {grade.justification && (
              <div className="rounded-lg border border-zinc-200/80 p-4 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                <strong className="block text-zinc-900 dark:text-white mb-1">
                  Evaluator Notes:
                </strong>
                {grade.justification}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcript Accordion / Viewer */}
      {outcome.transcript && outcome.transcript.length > 0 && (
        <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#161616] space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-zinc-500" />
            <h2 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
              Interview Transcript
            </h2>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-3 pr-2 text-xs">
            {outcome.transcript.map((turn, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  turn.role === 'EXAMINER'
                    ? 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60'
                    : 'border-blue-100 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/20'
                }`}
              >
                <span className="block font-semibold text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                  {turn.role}
                </span>
                <p className="text-zinc-800 dark:text-zinc-200">{turn.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appeals Section */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#161616] space-y-3">
        <h2 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
          Dispute or Appeal Outcome
        </h2>
        {outcome.appealOpen ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            An appeal for this defense is currently open and being reviewed by our academic
            integrity team.
          </div>
        ) : appealSuccess ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Appeal submitted successfully. This session is now marked for manual review.
          </div>
        ) : outcome.canAppeal ? (
          <div>
            {!showAppealForm ? (
              <button
                type="button"
                onClick={() => setShowAppealForm(true)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Submit Material Appeal
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <textarea
                  rows={3}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Detail the material discrepancy in the score or question grading (min 8 characters)..."
                  className="w-full rounded-md border border-zinc-200 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={appealReason.trim().length < 8 || submittingAppeal}
                    onClick={handleAppeal}
                    className="rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                  >
                    {submittingAppeal ? 'Submitting...' : 'Confirm Appeal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAppealForm(false)}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            This outcome is finalized. Appeals can only be submitted within the permitted window.
          </p>
        )}
      </div>
    </div>
  );
}
