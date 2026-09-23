'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  UserSearch,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import {
  SKILL_DEFINITIONS,
  type BatchDto,
  type CandidateMatchDto,
  type JobOpeningDto,
  type MatchMethod,
  type ShortlistDto,
} from '@smart/contracts';
import { api, applicationsApi, openingsApi } from '../lib/api';
import {
  buildSuggestionsCsv,
  buildSuggestionsPdf,
  downloadTextFile,
} from '../lib/suggestions-export';
import { CandidateSkillGapDrawer } from './matching/CandidateSkillGapDrawer';
import { CandidateSuggestionCard } from './matching/CandidateSuggestionCard';
import { useMatchRun } from '../lib/use-match-run';
import { FilterMultiSelect } from './matching/filter-multi-select';
import {
  errorNoticeClass,
  inputClass,
  labelClass,
  mutedTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
  selectClass,
  surfaceClass,
} from '../lib/tpo-ui';
import { PlacementEmptyState } from './placement/PlacementEmptyState';
import { JobOpeningIdLabel } from './placement/JobOpeningIdLabel';
import { PlacementPageHeader } from './placement/PlacementPageHeader';

const SKILL_OPTIONS = SKILL_DEFINITIONS.map((skill) => ({ id: skill.code, label: skill.name }));

const PAGE_SIZE = 10;

const openingSelectClass = `${selectClass} min-w-[240px]`;

const statLabelClass = sectionLabelClass;
const statValueClass = 'mt-1 text-sm font-semibold text-[var(--ds-text)]';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

function matchMethodLabel(method: MatchMethod | undefined): string {
  if (method === 'RULES') return 'Rules-ranked';
  if (method === 'SKILL_CAPABILITY') return 'Skill + capability match';
  return 'Matched';
}

function usesSkillCapabilityUi(
  shortlist: ShortlistDto | null,
  candidate: CandidateMatchDto,
): boolean {
  const method = shortlist?.matchMethod ?? candidate.method;
  return method === 'SKILL_CAPABILITY';
}

function noticeClass(tone: 'success' | 'danger' | 'info'): string {
  switch (tone) {
    case 'success':
      return 'rounded-xl border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] px-4 py-3 text-sm text-[var(--ds-text)]';
    case 'danger':
      return errorNoticeClass;
    default:
      return 'rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-4 py-3 text-sm text-[var(--ds-text-secondary)]';
  }
}

export function CandidateSuggestionsWorkspace({
  initialOpeningId,
  matchRunPollIntervalMs,
}: {
  initialOpeningId?: string;
  /** Test seam — production callers should leave this at the hook's default. */
  matchRunPollIntervalMs?: number;
}) {
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string>(initialOpeningId ?? '');
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<{
    tone: 'success' | 'danger' | 'info';
    title: string;
    message: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [skillGapStudentId, setSkillGapStudentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // S6-VV-76 pool-scoping filters — batches, min CGPA, required verified skills (all optional).
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [minCgpa, setMinCgpa] = useState('');
  const [requiredSkillCodes, setRequiredSkillCodes] = useState<string[]>([]);

  const {
    run,
    triggering,
    inProgress,
    error: runError,
    trigger,
    reset,
  } = useMatchRun(matchRunPollIntervalMs);
  const shortlist = run?.shortlist ?? null;

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

  useEffect(() => {
    void loadOpenings();
    void api.onboarding
      .listBatches()
      .then(setBatches)
      .catch(() => setBatches([]));
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    setSentIds(new Set());
    setSendNotice(null);
    setPage(1);
    reset();
  }, [selectedOpeningId]);

  useEffect(() => {
    setPage(1);
  }, [run?.runId]);

  async function runMatching() {
    if (!selectedOpeningId) return;
    const parsedCgpa = minCgpa.trim() ? Number(minCgpa) : undefined;
    await trigger({
      jdId: selectedOpeningId,
      batchIds: selectedBatchIds.length > 0 ? selectedBatchIds : undefined,
      minCgpa: parsedCgpa !== undefined && !Number.isNaN(parsedCgpa) ? parsedCgpa : undefined,
      requiredSkillCodes: requiredSkillCodes.length > 0 ? requiredSkillCodes : undefined,
      limit: 50,
      minSkillCoverage: 0.6,
    });
  }

  const selectedOpening = openings.find((o) => o.openingId === selectedOpeningId);

  // Guarantee candidates are sorted in descending order of matchScore
  const sortedCandidates = shortlist?.candidates
    ? [...shortlist.candidates].sort((a, b) => b.matchScore - a.matchScore)
    : [];

  const totalPages = Math.max(1, Math.ceil(sortedCandidates.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCandidates = sortedCandidates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function exportRows() {
    return sortedCandidates.map((candidate, index) => ({
      rank: index + 1,
      candidate,
      sent: sentIds.has(candidate.studentId),
    }));
  }

  function handleExportCsv() {
    if (!selectedOpening) return;
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `smart_suggestions_${selectedOpening.companyName}_${today}.csv`.replace(/\s+/g, '_'),
      buildSuggestionsCsv(selectedOpening, exportRows()),
      'text/csv;charset=utf-8;',
    );
  }

  function handleExportPdf() {
    if (!selectedOpening) return;
    const today = new Date().toISOString().slice(0, 10);
    const doc = buildSuggestionsPdf(selectedOpening, exportRows());
    doc.save(`smart_suggestions_${selectedOpening.companyName}_${today}.pdf`.replace(/\s+/g, '_'));
  }

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
    <>
      <PlacementPageHeader
        eyebrow="Placement · Candidate Discovery"
        title="Ranked Candidate Suggestions"
        description="Skill-ranked candidates for the selected opening. Shortlist to move a candidate into the ATS pipeline."
        actions={
          <>
            <label className="flex items-center gap-2">
              <span className={labelClass}>Opening</span>
              <select
                aria-label="Select Job Opening"
                className={openingSelectClass}
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

            <button
              type="button"
              className={`${secondaryButtonClass} h-10`}
              onClick={() => void loadOpenings()}
              disabled={loadingOpenings || triggering || inProgress}
            >
              Refresh
            </button>
          </>
        }
      />

      {error ? (
        <div role="status" className={errorNoticeClass}>
          <p className="font-semibold">Candidate Suggestions Error</p>
          <p className="mt-0.5">{error}</p>
        </div>
      ) : null}

      {runError ? (
        <div role="status" className={errorNoticeClass}>
          <p className="font-semibold">Matching Error</p>
          <p className="mt-0.5">{runError}</p>
        </div>
      ) : null}

      {sendNotice ? (
        <div role="status" className={noticeClass(sendNotice.tone)}>
          <p className="font-semibold">{sendNotice.title}</p>
          <p className="mt-0.5">{sendNotice.message}</p>
        </div>
      ) : null}

      {selectedOpeningId ? (
        <section
          aria-label="Matching filters"
          className={`${surfaceClass} flex flex-col gap-4 p-5`}
        >
          <p className={sectionLabelClass}>Scope this match run</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FilterMultiSelect
              label="Batches (leave empty for all)"
              placeholder="Search batches…"
              options={batches.map((batch) => ({ id: batch.batchId, label: batch.name }))}
              selectedIds={selectedBatchIds}
              onChange={setSelectedBatchIds}
            />
            <div>
              <label
                className={`mb-1.5 block text-xs font-semibold text-[var(--ds-text-secondary)]`}
              >
                Minimum CGPA
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                className={inputClass}
                placeholder="e.g. 8"
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
              />
            </div>
            <FilterMultiSelect
              label="Required verified skills"
              placeholder="Search skills…"
              options={SKILL_OPTIONS}
              selectedIds={requiredSkillCodes}
              onChange={setRequiredSkillCodes}
            />
          </div>
          <div>
            <button
              type="button"
              className={primaryButtonClass}
              onClick={() => void runMatching()}
              disabled={triggering || inProgress}
            >
              {triggering || inProgress ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Matching…
                </span>
              ) : (
                'Run matching'
              )}
            </button>
          </div>
        </section>
      ) : null}

      {selectedOpening ? (
        <section
          aria-label="Matching summary"
          className={`${surfaceClass} grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-5`}
        >
          <div>
            <p className={statLabelClass}>Role</p>
            <p className={statValueClass}>{selectedOpening.roleTitle}</p>
          </div>
          <div>
            <p className={statLabelClass}>Company</p>
            <p className={statValueClass}>{selectedOpening.companyName}</p>
          </div>
          <div>
            <p className={statLabelClass}>Location</p>
            <p className={statValueClass}>{selectedOpening.location}</p>
          </div>
          <div>
            <p className={statLabelClass}>Headcount</p>
            <p className={statValueClass}>{selectedOpening.headcount} position(s)</p>
          </div>
          {run && run.eligiblePoolCount !== null ? (
            <div>
              <p className={statLabelClass}>Eligible pool</p>
              <p className={statValueClass}>{run.eligiblePoolCount} students</p>
            </div>
          ) : null}
          {run && run.suggestedCount !== null ? (
            <div>
              <p className={statLabelClass}>Suggested</p>
              <p className={statValueClass}>{run.suggestedCount} candidates</p>
            </div>
          ) : null}
          <div className="col-span-2 sm:col-span-3 lg:col-span-5">
            <JobOpeningIdLabel openingId={selectedOpening.openingId} />
          </div>
        </section>
      ) : null}

      {loadingOpenings ? (
        <div role="status" className="flex flex-col gap-4">
          <p className={`text-sm ${mutedTextClass}`}>Loading job openings…</p>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${surfaceClass} h-28 animate-pulse`} />
          ))}
        </div>
      ) : triggering || inProgress ? (
        <div role="status" className="flex flex-col items-center gap-4 py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-green)]" />
          <p className={`text-sm ${mutedTextClass}`}>
            Matching candidates against the selected batches and filters…
          </p>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${surfaceClass} h-28 w-full animate-pulse`} />
          ))}
        </div>
      ) : !selectedOpeningId ? (
        <PlacementEmptyState
          icon={Briefcase}
          title="No job opening selected"
          description="Select a job opening to view ranked candidate suggestions."
        />
      ) : run?.status === 'FAILED' ? (
        <PlacementEmptyState
          icon={UserSearch}
          title="Matching failed"
          description={run.errorMessage ?? 'Something went wrong while matching. Try again.'}
        />
      ) : !run ? (
        <PlacementEmptyState
          icon={UserSearch}
          title="No match run yet"
          description="Set your batch/CGPA/skill filters above and click Run matching."
        />
      ) : sortedCandidates.length === 0 ? (
        <PlacementEmptyState
          icon={UserSearch}
          title="No ranked candidates"
          description={
            shortlist?.candidatesScoredCount === 0
              ? 'No one in the eligible pool holds any required skill as verified yet. Rankings use verified skills only.'
              : 'No suggested candidates matched this opening with the current filters.'
          }
        />
      ) : (
        <section aria-label="Ranked Candidates List" className="flex flex-col gap-4">
          <div className={`${surfaceClass} flex flex-wrap items-center justify-between gap-3 p-4`}>
            <p className={`text-sm ${mutedTextClass}`}>
              Showing{' '}
              <strong className="font-semibold text-[var(--ds-text)]">
                {pagedCandidates.length === 0
                  ? 0
                  : `${(currentPage - 1) * PAGE_SIZE + 1}–${(currentPage - 1) * PAGE_SIZE + pagedCandidates.length}`}
              </strong>{' '}
              of{' '}
              <strong className="font-semibold text-[var(--ds-text)]">
                {sortedCandidates.length}
              </strong>{' '}
              ranked candidates
              {run.eligiblePoolCount !== null &&
              shortlist?.candidatesScoredCount !== undefined &&
              shortlist.candidatesScoredCount < run.eligiblePoolCount ? (
                <>
                  {' '}
                  ({run.eligiblePoolCount - shortlist.candidatesScoredCount} in the pool had no
                  verified required skills)
                </>
              ) : null}
              {selectedIds.size > 0 ? (
                <>
                  {' '}
                  ·{' '}
                  <strong className="font-semibold text-[var(--ds-text)]">
                    {selectedIds.size}
                  </strong>{' '}
                  selected
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`hidden sm:inline ${sectionLabelClass}`}>
                {matchMethodLabel(shortlist?.matchMethod ?? sortedCandidates[0]?.method)}
              </span>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={handleExportCsv}
                title="Download this shortlist as a CSV file"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={handleExportPdf}
                title="Download a SMART-branded PDF of this shortlist"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => void sendOpportunity()}
                disabled={sending || inProgress}
              >
                {sending ? 'Sending…' : 'Send opportunity'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {pagedCandidates.map((candidate, index) => {
              const matchPercent = Math.round(candidate.matchScore * 100);
              const rank = (currentPage - 1) * PAGE_SIZE + index + 1;
              const skillCapability = usesSkillCapabilityUi(shortlist, candidate);
              const skillCoveragePct = candidate.explanation.skillCoveragePct;
              const capabilityCoveragePct = candidate.explanation.capabilityCoveragePct;
              const whyText =
                candidate.explanation.recruiterSummary ||
                candidate.explanation.why ||
                (skillCapability
                  ? 'Skill and capability profile computed for this role.'
                  : `Matched based on certification readiness for this role.`);

              return (
                <CandidateSuggestionCard
                  key={candidate.studentId}
                  candidate={candidate}
                  rank={rank}
                  skillCapability={skillCapability}
                  matchPercent={matchPercent}
                  whyText={whyText}
                  skillCoveragePct={skillCoveragePct}
                  capabilityCoveragePct={capabilityCoveragePct}
                  selected={selectedIds.has(candidate.studentId)}
                  opportunitySent={sentIds.has(candidate.studentId)}
                  sending={sending}
                  onToggleSelect={() => toggleCandidate(candidate.studentId)}
                  onViewSkillGap={() => setSkillGapStudentId(candidate.studentId)}
                />
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div
              className={`${surfaceClass} flex flex-wrap items-center justify-between gap-3 p-3`}
            >
              <p className={`text-xs ${mutedTextClass}`}>
                Page <strong className="font-semibold text-[var(--ds-text)]">{currentPage}</strong>{' '}
                of <strong className="font-semibold text-[var(--ds-text)]">{totalPages}</strong>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <CandidateSkillGapDrawer
        candidate={
          skillGapStudentId
            ? (sortedCandidates.find((row) => row.studentId === skillGapStudentId) ?? null)
            : null
        }
        roleTitle={shortlist?.roleTitle ?? 'this opening'}
        companyName={shortlist?.companyName ?? ''}
        isOpen={skillGapStudentId !== null}
        onClose={() => setSkillGapStudentId(null)}
      />
    </>
  );
}
