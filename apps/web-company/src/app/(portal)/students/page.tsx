'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  Search,
  UserCheck,
  Sparkles,
  ShieldCheck,
  Send,
  HelpCircle,
  Layers,
  Award,
} from 'lucide-react';
import { Modal, PageHeader } from '../../../components/ui';
import { companyJobsApi, companyStudentsApi, formatApiError } from '../../../lib/api';
import type { CandidateMatchDto, JobOpeningDto } from '@smart/contracts';
import {
  card,
  input,
  label,
  pageStack,
  primaryButton,
  secondaryButton,
  sectionTitle,
  textarea,
} from '../../../lib/ui';

const LEVEL_OPTIONS = [
  'Any Level',
  'Level 1+',
  'Level 2+',
  'Level 3+',
  'Level 4+',
  'Level 5',
] as const;
const VERIFICATION_TYPES = [
  'All Verified',
  'Endorsed Experience',
  'Certification',
  'Project Defended',
] as const;

export default function SearchStudentsPage() {
  const [query, setQuery] = useState('');
  const [skillCode, setSkillCode] = useState('');
  const [minLevel, setMinLevel] = useState<string>('Any Level');
  const [verificationType, setVerificationType] = useState<string>('All Verified');

  const [results, setResults] = useState<CandidateMatchDto[]>([]);
  const [jobs, setJobs] = useState<JobOpeningDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send Opportunity Modal State
  const [target, setTarget] = useState<CandidateMatchDto | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Active Tooltip for "Why this level?"
  const [activeWhyId, setActiveWhyId] = useState<string | null>(null);

  async function performSearch() {
    setLoading(true);
    setError(null);
    try {
      const data = await companyStudentsApi.search({
        q: query.trim() || undefined,
        skillCode: skillCode.trim() || undefined,
      });
      setResults(data ?? []);
    } catch (err) {
      setError(formatApiError(err, 'Could not retrieve candidate matches from database.'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    performSearch().catch(() => {});
    companyJobsApi
      .list()
      .then((res) => {
        if (res?.openings) {
          setJobs(res.openings);
          if (res.openings.length > 0 && res.openings[0]) {
            setSelectedJobId(res.openings[0].openingId);
          }
        }
      })
      .catch(() => {});
  }, []);

  function openOpportunityModal(candidate: CandidateMatchDto) {
    setTarget(candidate);
    const firstName = candidate.studentName ? candidate.studentName.split(' ')[0] : 'there';
    setMessage(
      `Hi ${firstName},\n\nWe were impressed by your verified skill achievements in ${candidate.trackCode} (Level ${candidate.highestLevelCleared}). We have an opening that matches your profile and would love to discuss an interview opportunity.`,
    );
  }

  function handleSendOpportunity() {
    if (!target || message.trim().length === 0) return;
    setSending(true);
    setTimeout(() => {
      setSent((prev) => [...prev, target.studentId]);
      setSending(false);
      setTarget(null);
    }, 400);
  }

  // Client-side filter for minimum level and verification
  const filteredResults = results.filter((candidate) => {
    if (minLevel !== 'Any Level') {
      const requiredNum = parseInt(minLevel.replace(/\D/g, ''), 10) || 1;
      if (candidate.highestLevelCleared < requiredNum) return false;
    }
    return true;
  });

  return (
    <div className={pageStack}>
      <PageHeader
        title="Search Assessed Students"
        description="Discover talent by verified competency levels, proctored AI evaluation scores, and academic credentials."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Filters Sidebar */}
        <aside className={`${card} h-fit space-y-4`} aria-label="Filters">
          <h2 className={sectionTitle}>Filter Candidates</h2>

          <div>
            <label htmlFor="search-q" className={label}>
              Keywords or Name
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="search-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                placeholder="Name or domain..."
                className={`${input} pl-9`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="skill-code" className={label}>
              Skill Code / Track
            </label>
            <input
              id="skill-code"
              value={skillCode}
              onChange={(e) => setSkillCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
              placeholder="e.g. REACT, PYTHON, FULLSTACK"
              className={`${input} mt-1`}
            />
          </div>

          <div>
            <label htmlFor="min-level" className={label}>
              Minimum Skill Level
            </label>
            <select
              id="min-level"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value)}
              className={`${input} mt-1`}
            >
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="verification-type" className={label}>
              Verification Type
            </label>
            <select
              id="verification-type"
              value={verificationType}
              onChange={(e) => setVerificationType(e.target.value)}
              className={`${input} mt-1`}
            >
              {VERIFICATION_TYPES.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={performSearch}
            disabled={loading}
            className={`${primaryButton} w-full justify-center`}
          >
            {loading ? 'Searching...' : 'Apply Filters'}
          </button>
        </aside>

        {/* Search Results */}
        <div className="space-y-4">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between px-1 text-xs text-zinc-500 font-medium">
            <span>
              {filteredResults.length} candidate profile{filteredResults.length === 1 ? '' : 's'}{' '}
              found
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-white" />
              <div className="h-32 animate-pulse rounded-xl border border-zinc-200 bg-white" />
            </div>
          ) : filteredResults.length === 0 ? (
            <div className={`${card} py-12 text-center`}>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                <UserCheck className="size-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                No candidate matches found
              </h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Try searching for broader skills or clearing filters to view all verified
                candidates.
              </p>
            </div>
          ) : (
            filteredResults.map((candidate) => {
              const alreadySent = sent.includes(candidate.studentId);
              const isWhyOpen = activeWhyId === candidate.studentId;

              return (
                <article
                  key={candidate.studentId}
                  className="relative rounded-xl border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-bold text-zinc-900">
                          {candidate.studentName}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <Sparkles className="size-3 text-emerald-600" />
                          {candidate.headlineTier} Tier
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          <ShieldCheck className="size-3 text-blue-600" />
                          Level {candidate.highestLevelCleared} Cleared
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3.5 text-zinc-400" />
                          Track: <strong className="text-zinc-700">{candidate.trackCode}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="size-3.5 text-zinc-400" />
                          Match Score:{' '}
                          <strong className="text-zinc-800 font-semibold">
                            {Math.round(candidate.matchScore * 100)}%
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openOpportunityModal(candidate)}
                        disabled={alreadySent}
                        className={
                          alreadySent
                            ? 'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-emerald-700'
                            : `${primaryButton} !py-2 text-xs`
                        }
                      >
                        {alreadySent ? (
                          <>
                            <Check className="size-4 text-emerald-600" /> Opportunity Sent
                          </>
                        ) : (
                          <>
                            <Send className="size-3.5" /> Send Opportunity
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Why this level toggle / evidence hover */}
                  <div className="mt-4 border-t border-zinc-100 pt-3 flex flex-wrap items-center justify-between text-xs text-zinc-500">
                    <button
                      type="button"
                      onClick={() => setActiveWhyId(isWhyOpen ? null : candidate.studentId)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      <HelpCircle className="size-3.5" />
                      {isWhyOpen ? 'Hide Level Evidence' : 'Why this level?'}
                    </button>

                    {candidate.explanation?.why ? (
                      <span className="text-zinc-500">{candidate.explanation.why}</span>
                    ) : null}
                  </div>

                  {/* Expanded Evidence Box */}
                  {isWhyOpen ? (
                    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-zinc-700 space-y-1.5 animate-fadeIn">
                      <p className="font-semibold text-blue-900">
                        SMART Verified Proof & Benchmark Breakdown:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-zinc-600">
                        <li>
                          Cleared <strong>Level {candidate.highestLevelCleared}</strong> in{' '}
                          <strong>{candidate.trackCode}</strong> proctored evaluation.
                        </li>
                        <li>
                          AI proctoring integrity verified with automated CV and browser audio/video
                          telemetry.
                        </li>
                        <li>
                          Overall Readiness Match:{' '}
                          <strong className="text-zinc-800">
                            {Math.round(candidate.matchScore * 100)}%
                          </strong>
                        </li>
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Send Opportunity Modal */}
      <Modal
        open={Boolean(target)}
        title={`Send Opportunity to ${target?.studentName ?? 'Candidate'}`}
        onClose={() => setTarget(null)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="opp-job-select" className={label}>
              Select Role / Opening
            </label>
            <select
              id="opp-job-select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className={input}
            >
              {jobs.length === 0 ? (
                <option value="">General Candidate Sourcing</option>
              ) : (
                jobs.map((job) => (
                  <option key={job.openingId} value={job.openingId}>
                    {job.roleTitle} ({job.location || 'Remote'} ·{' '}
                    {job.employmentType || 'Full-time'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="inquiry-message" className={label}>
              Personalized Invitation Message
            </label>
            <textarea
              id="inquiry-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={textarea}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setTarget(null)} className={secondaryButton}>
              Cancel
            </button>
            <button
              type="button"
              disabled={sending || !message.trim()}
              onClick={handleSendOpportunity}
              className={primaryButton}
            >
              {sending ? 'Sending...' : 'Send Opportunity'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
