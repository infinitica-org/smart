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
    <main className="mx-auto max-w-[1400px] space-y-6 p-6 font-sans select-none pb-12">
      {/* Header Bar */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#004C63]/10 text-[#004C63] text-xs font-bold mb-2 border border-[#004C63]/20">
            TPO Concierge · SE-T05 Match Ingest
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Ranked Candidate Suggestions
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-500 font-medium">
            Review SE-T05 rules-ranked candidates per job description with plain-language match
            explanations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Opening:</span>
            <select
              aria-label="Select Job Opening"
              className="h-10 min-w-[240px] rounded-xl border border-slate-200/90 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 shadow-xs focus:outline-none focus:border-[#004C63] focus:bg-white transition-all"
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
            className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs"
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-xs text-slate-600 font-medium shadow-xs flex flex-wrap gap-6 items-center">
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px] block text-slate-400">
              Role
            </span>
            <span className="font-bold text-slate-900 text-sm">{selectedOpening.roleTitle}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px] block text-slate-400">
              Company
            </span>
            <span className="font-bold text-slate-900 text-sm">{selectedOpening.companyName}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px] block text-slate-400">
              Location
            </span>
            <span className="font-bold text-slate-900 text-sm">{selectedOpening.location}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px] block text-slate-400">
              Headcount
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {selectedOpening.headcount} position(s)
            </span>
          </div>
          {shortlist ? (
            <>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div>
                <span className="font-bold uppercase tracking-wider text-[11px] block text-slate-400">
                  Evaluated
                </span>
                <span className="font-bold text-[#004C63] text-sm">
                  {shortlist.totalCandidatesConsidered} candidates
                </span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {loadingMatch || loadingOpenings ? (
        <div role="status" className="flex flex-col gap-4">
          <p className="text-sm font-medium text-slate-500">
            Fetching ranked candidate suggestions…
          </p>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
            />
          ))}
        </div>
      ) : !selectedOpeningId ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm font-medium text-slate-500 bg-white">
          Select a job opening to view ranked candidate suggestions.
        </div>
      ) : sortedCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm font-medium text-slate-500 bg-white">
          No suggested candidates match the requirements for this job opening.
        </div>
      ) : (
        <section aria-label="Ranked Candidates List" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm text-slate-500 font-medium bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span>
              Showing{' '}
              <strong className="text-slate-900 font-bold">{sortedCandidates.length}</strong> ranked
              candidates
              {selectedIds.size > 0 ? (
                <>
                  {' '}
                  · <strong className="text-[#004C63] font-bold">{selectedIds.size}</strong>{' '}
                  selected
                </>
              ) : null}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 hidden sm:inline">
                SE-T05 Ranked
              </span>
              <Button
                className="bg-[#004C63] hover:bg-[#0A4D5C] text-white font-bold text-xs rounded-xl px-5 py-2.5 shadow-xs transition-all"
                onClick={() => void sendOpportunity()}
                disabled={sending || loadingMatch}
              >
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
                  className="flex flex-col gap-4 p-6 rounded-2xl bg-white shadow-xs border border-slate-200/80 transition-all hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded text-[#004C63] focus:ring-[#004C63] cursor-pointer"
                        aria-label={`Select ${candidate.studentName}`}
                        checked={selectedIds.has(candidate.studentId)}
                        disabled={sending || sentIds.has(candidate.studentId)}
                        onChange={() => toggleCandidate(candidate.studentId)}
                      />
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#004C63] text-white text-xs font-extrabold shadow-xs">
                        #{rank}
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          {candidate.studentName}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] border border-slate-200/60 font-semibold text-slate-700">
                            {candidate.trackCode}
                          </span>
                          <span>·</span>
                          <span className="font-semibold text-slate-700">
                            Level {candidate.highestLevelCleared} Cleared
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${tierBadgeClass(
                          candidate.headlineTier,
                        )}`}
                      >
                        {candidate.headlineTier} (
                        {TIER_LABEL[candidate.headlineTier] ?? candidate.headlineTier})
                      </span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                        {matchPercent}% Match
                      </span>
                      {sentIds.has(candidate.studentId) ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                          Opportunity sent
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* One-line Plain Language Match Explanation */}
                  <div className="rounded-xl bg-[#F0FDFA]/60 p-4 border border-[#CCFBF1]">
                    <p className="text-[11px] font-bold text-[#004C63] uppercase tracking-wider mb-1">
                      Match Explanation
                    </p>
                    <p className="text-xs md:text-sm text-slate-800 font-semibold leading-relaxed">
                      {whyText}
                    </p>
                  </div>

                  {/* Additional Thresholds/Competencies Context */}
                  {candidate.explanation.strongCompetencies.length > 0 ||
                  candidate.explanation.gapCompetencies.length > 0 ? (
                    <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-slate-100 font-medium">
                      {candidate.explanation.strongCompetencies.length > 0 ? (
                        <div>
                          <span className="text-slate-500">Strong competencies:</span>{' '}
                          <span className="text-emerald-700 font-bold">
                            {candidate.explanation.strongCompetencies.join(', ')}
                          </span>
                        </div>
                      ) : null}
                      {candidate.explanation.gapCompetencies.length > 0 ? (
                        <div>
                          <span className="text-slate-500">Gaps identified:</span>{' '}
                          <span className="text-amber-700 font-bold">
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
