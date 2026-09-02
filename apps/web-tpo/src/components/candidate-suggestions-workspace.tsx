'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import {
  TIER_LABEL,
  type CandidateMatchDto,
  type JobOpeningDto,
  type ShortlistDto,
} from '@smart/contracts';
import { Alert, Button, Card } from '@smart/ui';
import { applicationsApi, matchingApi, openingsApi } from '../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

function tierBadgeClass(tier: CandidateMatchDto['headlineTier']): string {
  switch (tier) {
    case 'GOLD':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800';
    case 'SILVER':
      return 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
    case 'BRONZE':
      return 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800';
    default:
      return 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--surface-border)]';
  }
}

export function CandidateSuggestionsWorkspace({ initialOpeningId }: { initialOpeningId?: string }) {
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string>(initialOpeningId ?? '');
  const [shortlist, setShortlist] = useState<ShortlistDto | null>(null);
  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<{
    tone: 'success' | 'danger' | 'info';
    title: string;
    message: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  async function loadOpenings() {
    setLoadingOpenings(true);
    setError(null);
    try {
      const res = await openingsApi.list();
      setOpenings(res.openings);
      if (res.openings.length > 0 && !selectedOpeningId) {
        setSelectedOpeningId(res.openings[0]?.openingId ?? '');
      }
    } catch (caught) {
      setError(errorMessage(caught, 'Could not load job openings.'));
    } finally {
      setLoadingOpenings(false);
    }
  }

  async function loadSuggestions(openingId: string) {
    if (!openingId) {
      setShortlist(null);
      return;
    }
    setLoadingMatch(true);
    setError(null);
    try {
      const res = await matchingApi.match({ jdId: openingId, limit: 50 });
      setShortlist(res);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not fetch ranked candidate suggestions.'));
      setShortlist(null);
    } finally {
      setLoadingMatch(false);
    }
  }

  useEffect(() => {
    void loadOpenings();
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    setSentIds(new Set());
    setSendNotice(null);
    if (selectedOpeningId) {
      void loadSuggestions(selectedOpeningId);
    }
  }, [selectedOpeningId]);

  const selectedOpening = openings.find((o) => o.openingId === selectedOpeningId);

  // Guarantee candidates are sorted in descending order of matchScore
  const sortedCandidates = shortlist?.candidates
    ? [...shortlist.candidates].sort((a, b) => b.matchScore - a.matchScore)
    : [];

  function toggleCandidate(studentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function sendOpportunity() {
    if (!selectedOpeningId) return;
    const chosen = sortedCandidates.filter((candidate) => selectedIds.has(candidate.studentId));
    if (chosen.length === 0) {
      setSendNotice({
        tone: 'info',
        title: 'No candidates selected',
        message: 'Select at least one candidate to send an opportunity.',
      });
      return;
    }

    setSending(true);
    setSendNotice(null);
    setError(null);

    let sent = 0;
    let duplicates = 0;
    let failed = 0;
    let lastFailure: string | null = null;
    const newlySent: string[] = [];

    for (const candidate of chosen) {
      try {
        await applicationsApi.create({
          openingId: selectedOpeningId,
          studentId: candidate.studentId,
          matchScore: candidate.matchScore,
        });
        sent += 1;
        newlySent.push(candidate.studentId);
      } catch (caught) {
        if (isSmartApiError(caught) && caught.statusCode === 409) {
          duplicates += 1;
          newlySent.push(candidate.studentId);
        } else {
          failed += 1;
          lastFailure = errorMessage(caught, 'Could not send opportunity.');
        }
      }
    }

    if (newlySent.length > 0) {
      setSentIds((current) => new Set([...current, ...newlySent]));
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const id of newlySent) next.delete(id);
        return next;
      });
    }

    const parts: string[] = [];
    if (sent > 0) parts.push(`${sent} shortlisted`);
    if (duplicates > 0) parts.push(`${duplicates} already shortlisted`);
    if (failed > 0) parts.push(`${failed} failed${lastFailure ? ` (${lastFailure})` : ''}`);

    setSendNotice({
      tone:
        failed > 0 && sent === 0 && duplicates === 0 ? 'danger' : failed > 0 ? 'info' : 'success',
      title:
        failed > 0 && sent === 0 && duplicates === 0
          ? 'Could not send opportunity'
          : 'Opportunity sent',
      message: parts.join('. ') + '.',
    });
    setSending(false);
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            TPO Concierge · SE-T05 Match Ingest
          </p>
          <h1 className="text-2xl font-bold text-[var(--text)]">Ranked Candidate Suggestions</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Review SE-T05 rules-ranked candidates per job description with plain-language match
            explanations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>Job opening:</span>
            <select
              aria-label="Select Job Opening"
              className="h-10 min-w-[240px] rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 text-sm font-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedOpeningId}
              onChange={(e) => setSelectedOpeningId(e.target.value)}
              disabled={loadingOpenings || openings.length === 0}
            >
              {openings.length === 0 ? (
                <option value="">No openings found</option>
              ) : (
                openings.map((opening) => (
                  <option key={opening.openingId} value={opening.openingId}>
                    {opening.roleTitle} ({opening.companyName})
                  </option>
                ))
              )}
            </select>
          </label>

          <Button
            variant="outline"
            onClick={() => {
              void loadOpenings();
              if (selectedOpeningId) void loadSuggestions(selectedOpeningId);
            }}
            disabled={loadingOpenings || loadingMatch}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <Alert tone="danger" title="Candidate Suggestions Error">
          {error}
        </Alert>
      ) : null}

      {sendNotice ? (
        <Alert tone={sendNotice.tone} title={sendNotice.title}>
          {sendNotice.message}
        </Alert>
      ) : null}

      {selectedOpening ? (
        <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-muted)] flex flex-wrap gap-6">
          <div>
            <span className="font-semibold text-[var(--text)]">Role:</span>{' '}
            {selectedOpening.roleTitle}
          </div>
          <div>
            <span className="font-semibold text-[var(--text)]">Company:</span>{' '}
            {selectedOpening.companyName}
          </div>
          <div>
            <span className="font-semibold text-[var(--text)]">Location:</span>{' '}
            {selectedOpening.location}
          </div>
          <div>
            <span className="font-semibold text-[var(--text)]">Headcount:</span>{' '}
            {selectedOpening.headcount}
          </div>
          {shortlist ? (
            <div>
              <span className="font-semibold text-[var(--text)]">Candidates Evaluated:</span>{' '}
              {shortlist.totalCandidatesConsidered}
            </div>
          ) : null}
        </div>
      ) : null}

      {loadingMatch || loadingOpenings ? (
        <div role="status" className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)]">Fetching ranked candidate suggestions…</p>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[var(--surface-border)] bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : !selectedOpeningId ? (
        <p className="rounded-lg border border-dashed border-[var(--surface-border)] p-8 text-center text-sm text-[var(--text-muted)]">
          Select a job opening to view ranked candidate suggestions.
        </p>
      ) : sortedCandidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--surface-border)] p-8 text-center text-sm text-[var(--text-muted)]">
          No suggested candidates match the requirements for this job opening.
        </p>
      ) : (
        <section aria-label="Ranked Candidates List" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
            <span>
              Showing <strong className="text-[var(--text)]">{sortedCandidates.length}</strong>{' '}
              ranked candidates
              {selectedIds.size > 0 ? (
                <>
                  {' '}
                  · <strong className="text-[var(--text)]">{selectedIds.size}</strong> selected
                </>
              ) : null}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-semibold">
                Ranked by SE-T05 Match Score
              </span>
              <Button onClick={() => void sendOpportunity()} disabled={sending || loadingMatch}>
                {sending ? 'Sending…' : 'Send opportunity'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {sortedCandidates.map((candidate, index) => {
              const matchPercent = Math.round(candidate.matchScore * 100);
              const rank = index + 1;
              const whyText =
                candidate.explanation.why ||
                `Matched based on ${candidate.headlineTier} tier status and Level ${candidate.highestLevelCleared} clearance.`;

              return (
                <Card
                  key={candidate.studentId}
                  className="flex flex-col gap-3 p-5 shadow-sm transition-all hover:shadow-md border border-[var(--surface-border)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-600"
                        aria-label={`Select ${candidate.studentName}`}
                        checked={selectedIds.has(candidate.studentId)}
                        disabled={sending || sentIds.has(candidate.studentId)}
                        onChange={() => toggleCandidate(candidate.studentId)}
                      />
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-800 text-xs font-bold dark:bg-brand-950 dark:text-brand-300">
                        #{rank}
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-[var(--text)]">
                          {candidate.studentName}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                          <span className="rounded bg-[var(--surface-subtle)] px-2 py-0.5 font-mono text-[11px] border border-[var(--surface-border)]">
                            {candidate.trackCode}
                          </span>
                          <span>·</span>
                          <span>Level {candidate.highestLevelCleared} Cleared</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tierBadgeClass(
                          candidate.headlineTier,
                        )}`}
                      >
                        {candidate.headlineTier} (
                        {TIER_LABEL[candidate.headlineTier] ?? candidate.headlineTier})
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {matchPercent}% Match
                      </span>
                      {sentIds.has(candidate.studentId) ? (
                        <span className="rounded-full border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">
                          Opportunity sent
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* One-line Plain Language Match Explanation */}
                  <div className="rounded-lg bg-[var(--surface-subtle)] p-3 border border-[var(--surface-border)]">
                    <p className="text-xs font-medium text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1">
                      Match Explanation
                    </p>
                    <p className="text-sm text-[var(--text)] font-normal">{whyText}</p>
                  </div>

                  {/* Additional Thresholds/Competencies Context */}
                  {candidate.explanation.strongCompetencies.length > 0 ||
                  candidate.explanation.gapCompetencies.length > 0 ? (
                    <div className="flex flex-wrap gap-4 text-xs pt-1 border-t border-[var(--surface-border)]">
                      {candidate.explanation.strongCompetencies.length > 0 ? (
                        <div>
                          <span className="text-[var(--text-muted)] font-medium">
                            Strong competencies:
                          </span>{' '}
                          <span className="text-emerald-700 dark:text-emerald-400">
                            {candidate.explanation.strongCompetencies.join(', ')}
                          </span>
                        </div>
                      ) : null}
                      {candidate.explanation.gapCompetencies.length > 0 ? (
                        <div>
                          <span className="text-[var(--text-muted)] font-medium">
                            Gaps identified:
                          </span>{' '}
                          <span className="text-amber-700 dark:text-amber-400">
                            {candidate.explanation.gapCompetencies.join(', ')}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
