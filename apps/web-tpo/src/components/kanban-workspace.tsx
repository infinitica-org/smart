'use client';

import { useEffect, useState } from 'react';
import { Columns3, Inbox } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import {
  TrackCodeSchema,
  type ApplicationDto,
  type AtsStage,
  type JobOpeningDto,
  type TrackCode,
} from '@smart/contracts';
import { Alert } from '@smart/ui';
import { applicationsApi, openingsApi, placementOutcomesApi } from '../lib/api';
import { ATS_STAGE_ORDER } from '../lib/ats-stage-ui';
import {
  accentChipClass,
  cardCompactClass,
  inputClass,
  labelClass,
  mutedTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionLabelClass,
} from '../lib/tpo-ui';
import { PlacementEmptyState } from './placement/PlacementEmptyState';
import { PlacementPageHeader } from './placement/PlacementPageHeader';

type HireModalState = {
  applicationId: string;
  studentId: string;
  companyName: string;
  trackCode: TrackCode | undefined;
  cycle: string;
  packageLpa: string;
};

/** Defaults the placement cycle to the current year + season the RecordOutcomeRequest expects. */
function defaultPlacementCycle(date = new Date()): string {
  const month = date.getMonth();
  const season =
    month <= 1 || month === 11
      ? 'WINTER'
      : month <= 4
        ? 'SPRING'
        : month <= 7
          ? 'SUMMER'
          : 'AUTUMN';
  return `${date.getFullYear()}-${season}`;
}

const selectClass =
  'rounded-[9px] border border-[var(--ds-border)] bg-[var(--ds-surface)] font-semibold text-[var(--ds-text)] transition focus:border-[var(--tpo-accent-border)] focus:outline-2 focus:outline-offset-0 focus:outline-[var(--tpo-accent)] disabled:opacity-50';

const countPillClass =
  'inline-flex min-w-[22px] justify-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ds-text-secondary)]';

/** Fixed-width columns in a scroller: eight grid columns beside the placement sidebar collapse to ~140px. */
const columnWidthClass = 'w-[260px] shrink-0';

const boardScrollerClass = '-mx-4 overflow-x-auto px-4 pb-2 select-none md:mx-0 md:px-0';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

export function KanbanWorkspace() {
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string>('');
  const [applications, setApplications] = useState<ApplicationDto[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [hireModal, setHireModal] = useState<HireModalState | null>(null);
  const [recordingOutcome, setRecordingOutcome] = useState(false);

  async function loadOpenings() {
    setLoadingOpenings(true);
    setError(null);
    try {
      const res = await openingsApi.list();
      setOpenings(res.openings);
      if (res.openings.length > 0 && !selectedOpeningId) {
        const defaultId = res.openings[0]?.openingId ?? '';
        setSelectedOpeningId(defaultId);
      }
    } catch (caught) {
      setError(errorMessage(caught, 'Could not load job openings.'));
    } finally {
      setLoadingOpenings(false);
    }
  }

  async function loadApplications(openingId: string) {
    if (!openingId) {
      setApplications([]);
      return;
    }
    setLoadingApps(true);
    setError(null);
    try {
      const res = await applicationsApi.listForOpening(openingId);
      setApplications(res.applications);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not load candidate applications.'));
    } finally {
      setLoadingApps(false);
    }
  }

  useEffect(() => {
    void loadOpenings();
  }, []);

  useEffect(() => {
    if (selectedOpeningId) {
      void loadApplications(selectedOpeningId);
    }
  }, [selectedOpeningId]);

  function handleMoveStage(applicationId: string, targetStage: AtsStage) {
    const appToMove = applications.find((a) => a.applicationId === applicationId);
    if (!appToMove || appToMove.stage === targetStage) return;

    if (targetStage === 'HIRED') {
      const parsedTrack = TrackCodeSchema.safeParse(appToMove.primaryTrackCode);
      setHireModal({
        applicationId,
        studentId: appToMove.studentId,
        companyName: selectedOpening?.companyName ?? '',
        trackCode: parsedTrack.success ? parsedTrack.data : undefined,
        cycle: defaultPlacementCycle(),
        packageLpa: '',
      });
      setDraggedAppId(null);
      return;
    }

    void moveStage(applicationId, targetStage);
  }

  async function moveStage(applicationId: string, targetStage: AtsStage): Promise<boolean> {
    const appToMove = applications.find((a) => a.applicationId === applicationId);
    if (!appToMove || appToMove.stage === targetStage) return true;

    const previousStage = appToMove.stage;

    // Optimistic UI update
    setApplications((current) =>
      current.map((app) =>
        app.applicationId === applicationId ? { ...app, stage: targetStage } : app,
      ),
    );
    setUpdatingId(applicationId);
    setError(null);

    try {
      const updated = await applicationsApi.patchStage(applicationId, targetStage);
      setApplications((current) =>
        current.map((app) => (app.applicationId === applicationId ? updated : app)),
      );
      return true;
    } catch (caught) {
      // Rollback on failure
      setApplications((current) =>
        current.map((app) =>
          app.applicationId === applicationId ? { ...app, stage: previousStage } : app,
        ),
      );
      setError(
        `Could not move candidate to ${targetStage}: ${errorMessage(caught, 'Stage update failed.')}`,
      );
      return false;
    } finally {
      setUpdatingId(null);
      setDraggedAppId(null);
    }
  }

  async function confirmHire() {
    if (!hireModal) return;
    const { applicationId, studentId, companyName, trackCode, cycle, packageLpa } = hireModal;

    setRecordingOutcome(true);
    const moved = await moveStage(applicationId, 'HIRED');

    if (moved && trackCode) {
      try {
        await placementOutcomesApi.record({
          studentId,
          trackCode,
          placementCycle: cycle,
          companyName,
          outcome: 'ACCEPTED',
          interviewOffered: true,
          jobOffered: true,
          offeredPackageLpa: packageLpa.trim() ? Number(packageLpa) : null,
        });
      } catch (caught) {
        setError(
          `Candidate marked Hired, but the placement outcome could not be recorded: ${errorMessage(
            caught,
            'Recording failed.',
          )}`,
        );
      }
    } else if (moved && !trackCode) {
      setError(
        'Candidate marked Hired, but no track is on file for them — the placement outcome (CTC) was not recorded.',
      );
    }

    setRecordingOutcome(false);
    setHireModal(null);
  }

  const selectedOpening = openings.find((o) => o.openingId === selectedOpeningId);

  return (
    <>
      <PlacementPageHeader
        eyebrow="Placement · Pipeline"
        title="Candidate ATS"
        description="Move candidates across placement stages. Drag a card or use the stage selector on the card."
        actions={
          <>
            <label className={`flex items-center gap-2 ${labelClass}`}>
              <span>Opening</span>
              <select
                aria-label="Select Job Opening"
                className={`${selectClass} h-9 min-w-[240px] px-2.5 text-xs`}
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
              className={secondaryButtonClass}
              onClick={() => {
                void loadOpenings();
                if (selectedOpeningId) void loadApplications(selectedOpeningId);
              }}
              disabled={loadingOpenings || loadingApps}
            >
              Refresh
            </button>
          </>
        }
      />

      {error ? (
        <Alert tone="danger" title="ATS Kanban Error">
          {error}
        </Alert>
      ) : null}

      {selectedOpening ? (
        <div className={`${cardCompactClass} flex flex-wrap items-center gap-x-8 gap-y-4`}>
          <div className="min-w-0">
            <p className={sectionLabelClass}>Role</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">
              {selectedOpening.roleTitle}
            </p>
          </div>
          <div className="min-w-0">
            <p className={sectionLabelClass}>Company</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">
              {selectedOpening.companyName}
            </p>
          </div>
          <div className="min-w-0">
            <p className={sectionLabelClass}>Headcount</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">
              {selectedOpening.headcount} position(s)
            </p>
          </div>
          <div className="min-w-0">
            <p className={sectionLabelClass}>Location</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">
              {selectedOpening.location}
            </p>
          </div>
          <div className="min-w-0">
            <p className={sectionLabelClass}>Total Applicants</p>
            <p className="mt-1">
              <span className={accentChipClass}>{applications.length} candidates</span>
            </p>
          </div>
        </div>
      ) : null}

      {loadingApps || loadingOpenings ? (
        <div role="status" className={boardScrollerClass}>
          <div className="flex gap-4">
            {ATS_STAGE_ORDER.map((column) => (
              <div
                key={column.id}
                className={`${columnWidthClass} flex flex-col gap-3 rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] p-4`}
              >
                <div className="h-5 w-24 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
                <div className="h-20 animate-pulse rounded-xl bg-[var(--ds-surface-muted)]" />
              </div>
            ))}
          </div>
        </div>
      ) : !selectedOpeningId ? (
        <PlacementEmptyState
          icon={Columns3}
          title="No pipeline yet"
          description="Shortlist candidates from Candidate Suggestions to populate the ATS pipeline."
        />
      ) : (
        <div className={boardScrollerClass}>
          <section aria-label="Kanban columns" className="flex gap-4">
            {ATS_STAGE_ORDER.map((column) => {
              const columnApps = applications.filter((app) => app.stage === column.id);
              return (
                <div
                  key={column.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedAppId) {
                      void handleMoveStage(draggedAppId, column.id);
                    }
                  }}
                  className={`${columnWidthClass} flex flex-col overflow-hidden rounded-2xl border bg-[var(--ds-surface-muted)] transition ${
                    draggedAppId
                      ? 'border-[var(--tpo-accent-border)] hover:border-[var(--tpo-accent)] hover:bg-[var(--tpo-accent-tint)]'
                      : 'border-[var(--ds-border)]'
                  }`}
                >
                  <div aria-hidden="true" className={`h-[3px] w-full ${column.railClass}`} />
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2.5">
                    <h2 className={sectionLabelClass}>{column.label}</h2>
                    <span className={countPillClass}>{columnApps.length}</span>
                  </div>

                  <div className="flex min-h-[340px] flex-1 flex-col gap-2.5 p-2.5">
                    {columnApps.length === 0 ? (
                      <PlacementEmptyState
                        size="compact"
                        icon={Inbox}
                        title="No candidates"
                        description=""
                      />
                    ) : (
                      columnApps.map((app) => {
                        const isUpdating = updatingId === app.applicationId;
                        return (
                          <div
                            key={app.applicationId}
                            draggable={!isUpdating}
                            onDragStart={(e) => {
                              setDraggedAppId(app.applicationId);
                              e.dataTransfer.setData('text/plain', app.applicationId);
                            }}
                            onDragEnd={() => setDraggedAppId(null)}
                            className={`cursor-grab rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-3 shadow-[var(--ds-card-shadow)] transition hover:border-[var(--tpo-accent-border)] hover:bg-[var(--ds-surface-hover)] active:cursor-grabbing ${
                              isUpdating ? 'pointer-events-none opacity-50' : ''
                            } ${
                              draggedAppId === app.applicationId
                                ? 'opacity-60 ring-2 ring-[var(--tpo-accent)]'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="text-xs leading-tight font-semibold text-[var(--ds-text)]">
                                  {app.studentName ?? `Student ${app.studentId.slice(0, 8)}`}
                                </span>
                                {app.matchScore !== null ? (
                                  <span className="shrink-0 rounded-full border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ds-text)]">
                                    {Math.round(app.matchScore * 100)}% Match
                                  </span>
                                ) : null}
                              </div>

                              {app.studentEmail ? (
                                <p className="truncate text-[11px] text-[var(--ds-text-muted)]">
                                  {app.studentEmail}
                                </p>
                              ) : null}

                              {app.primaryTrackCode ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ds-text-secondary)]">
                                    {app.primaryTrackCode}
                                  </span>
                                </div>
                              ) : null}

                              {/* Dropdown selector for quick stage change */}
                              <div className="flex items-center justify-between border-t border-[var(--ds-border-subtle)] pt-2">
                                <label className="flex w-full items-center justify-between gap-1 text-[10px] font-semibold text-[var(--ds-text-subtle)]">
                                  <span>Move Stage</span>
                                  <select
                                    aria-label={`Change stage for ${app.studentName ?? app.studentId}`}
                                    className={`${selectClass} max-w-[140px] px-1.5 py-0.5 text-[11px]`}
                                    value={app.stage}
                                    onChange={(e) =>
                                      void handleMoveStage(
                                        app.applicationId,
                                        e.target.value as AtsStage,
                                      )
                                    }
                                    disabled={isUpdating}
                                  >
                                    {ATS_STAGE_ORDER.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}

      {hireModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${cardCompactClass} w-full max-w-sm p-5`}>
            <h2 className="text-sm font-semibold text-[var(--ds-text)]">Mark candidate as Hired</h2>
            <p className={`mt-1 text-xs ${mutedTextClass}`}>
              Record the placement outcome for {hireModal.companyName || 'this company'} — it powers
              the company placement-stats page.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Placement cycle</span>
                <input
                  type="text"
                  className={inputClass}
                  value={hireModal.cycle}
                  onChange={(e) => setHireModal({ ...hireModal, cycle: e.target.value })}
                  placeholder="e.g. 2026-AUTUMN"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Offered package (LPA)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className={inputClass}
                  value={hireModal.packageLpa}
                  onChange={(e) => setHireModal({ ...hireModal, packageLpa: e.target.value })}
                  placeholder="e.g. 8.5"
                />
              </label>
              {!hireModal.trackCode ? (
                <p className="text-xs text-[var(--ds-coral)]">
                  No track is on file for this candidate — the stage will move to Hired, but a CTC
                  outcome cannot be recorded without a track.
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setHireModal(null)}
                disabled={recordingOutcome}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => void confirmHire()}
                disabled={recordingOutcome}
              >
                {recordingOutcome ? 'Saving…' : 'Confirm Hired'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
