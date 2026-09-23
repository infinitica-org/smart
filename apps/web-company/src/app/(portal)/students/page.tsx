'use client';

import { useEffect, useState } from 'react';
import { Check, Search, UserCheck, Sparkles, Building2 } from 'lucide-react';
import { Badge, Modal, PageHeader } from '../../../components/ui';
import { companyStudentsApi, formatApiError } from '../../../lib/api';
import type { CandidateMatchDto } from '@smart/contracts';
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

export default function SearchStudentsPage() {
  const [query, setQuery] = useState('');
  const [skillCode, setSkillCode] = useState('');
  const [results, setResults] = useState<CandidateMatchDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<CandidateMatchDto | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string[]>([]);

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
  }, []);

  function openModal(candidate: CandidateMatchDto) {
    setTarget(candidate);
    const firstName = candidate.studentName ? candidate.studentName.split(' ')[0] : 'there';
    setMessage(
      `Hi ${firstName}, we reviewed your verified skills and credentials on SMART and would love to connect regarding opportunities at our company.`,
    );
  }

  function send() {
    if (!target || message.trim().length === 0) return;
    setSent((prev) => [...prev, target.studentId]);
    setTarget(null);
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title="Search Assessed Candidates"
        description="Discover talent by verified competency levels, proctored AI evaluation scores, and academic credentials."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
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
              placeholder="e.g. REACT, PYTHON, SQL"
              className={`${input} mt-1`}
            />
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
              {results.length} candidate profile{results.length === 1 ? '' : 's'} available
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-28 animate-pulse rounded-md border border-zinc-200 bg-white" />
              <div className="h-28 animate-pulse rounded-md border border-zinc-200 bg-white" />
            </div>
          ) : results.length === 0 ? (
            <div className={`${card} py-12 text-center`}>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                <UserCheck className="size-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                No candidate matches found
              </h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Try searching for broader skills or clearing your query filters to view all verified
                candidates.
              </p>
            </div>
          ) : (
            results.map((candidate) => {
              const alreadySent = sent.includes(candidate.studentId);
              return (
                <article
                  key={candidate.studentId}
                  className="rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-heading text-base font-bold text-zinc-900">
                          {candidate.studentName}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <Sparkles className="size-3 text-emerald-600" />
                          {candidate.headlineTier} Tier
                        </span>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Building2 className="size-3.5 text-zinc-400" />
                        Track: {candidate.trackCode} · Level {candidate.highestLevelCleared} Cleared
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(candidate)}
                        disabled={alreadySent}
                        className={alreadySent ? `${secondaryButton} opacity-70` : primaryButton}
                      >
                        {alreadySent ? (
                          <>
                            <Check className="size-4 text-emerald-600" />
                            Message Sent
                          </>
                        ) : (
                          'Send Inquiry'
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-zinc-100 pt-3 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      Match Score:{' '}
                      <strong className="font-medium text-zinc-700">
                        {Math.round(candidate.matchScore * 100)}%
                      </strong>
                    </span>
                    {candidate.explanation.why ? <span>{candidate.explanation.why}</span> : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Message Modal */}
      <Modal
        open={Boolean(target)}
        title={`Connect with ${target?.studentName ?? 'Candidate'}`}
        onClose={() => setTarget(null)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="inquiry-message" className={label}>
              Direct Message / Opportunity Brief
            </label>
            <textarea
              id="inquiry-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={textarea}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setTarget(null)} className={secondaryButton}>
              Cancel
            </button>
            <button type="button" onClick={send} className={primaryButton}>
              Send Message
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
