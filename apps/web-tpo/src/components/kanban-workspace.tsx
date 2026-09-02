'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { ApplicationDto, AtsStage, JobOpeningDto } from '@smart/contracts';
import { Alert, Button, Card } from '@smart/ui';
import { applicationsApi, openingsApi } from '../lib/api';

const KANBAN_STAGES: Array<{
  id: AtsStage;
  label: string;
  description: string;
  headerColor: string;
}> = [
  {
    id: 'APPLIED',
    label: 'Applied / New Matches',
    description: 'Candidates who applied or matched this opening',
    headerColor: 'border-t-brand-500 bg-brand-50/50 dark:bg-brand-950/20',
  },
  {
    id: 'SHORTLISTED',
    label: 'Shortlisted',
    description: 'Selected candidates for preliminary review',
    headerColor: 'border-t-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
  },
  {
    id: 'INTERVIEW',
    label: 'Interviewing',
    description: 'Active candidates undergoing interviews',
    headerColor: 'border-t-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
  },
  {
    id: 'OFFER',
    label: 'Offer',
    description: 'Candidates with job offer extended',
    headerColor: 'border-t-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20',
  },
  {
    id: 'REJECTED',
    label: 'Rejected',
    description: 'Candidates not selected for this opening',
    headerColor: 'border-t-rose-500 bg-rose-50/50 dark:bg-rose-950/20',
  },
  {
    id: 'WITHDRAWN',
    label: 'Withdrawn',
    description: 'Candidates who withdrew application',
    headerColor: 'border-t-slate-400 bg-slate-50/50 dark:bg-slate-900/20',
  },
];

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

  async function handleMoveStage(applicationId: string, targetStage: AtsStage) {
    const appToMove = applications.find((a) => a.applicationId === applicationId);
    if (!appToMove || appToMove.stage === targetStage) return;

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
    } finally {
      setUpdatingId(null);
      setDraggedAppId(null);
    }
  }

  const selectedOpening = openings.find((o) => o.openingId === selectedOpeningId);

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            TPO Concierge · ATS
          </p>
          <h1 className="text-2xl font-bold text-[var(--text)]">Candidate ATS Kanban Board</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage candidate progression across placement pipeline stages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>Job opening:</span>
            <select
              aria-label="Select Job Opening"
              className="h-10 min-w-[220px] rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-3 text-sm font-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              if (selectedOpeningId) void loadApplications(selectedOpeningId);
            }}
            disabled={loadingOpenings || loadingApps}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <Alert tone="danger" title="ATS Kanban Error">
          {error}
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
            <span className="font-semibold text-[var(--text)]">Headcount:</span>{' '}
            {selectedOpening.headcount}
          </div>
          <div>
            <span className="font-semibold text-[var(--text)]">Location:</span>{' '}
            {selectedOpening.location}
          </div>
          <div>
            <span className="font-semibold text-[var(--text)]">Total Candidates:</span>{' '}
            {applications.length}
          </div>
        </div>
      ) : null}

      {loadingApps || loadingOpenings ? (
        <div role="status" className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {KANBAN_STAGES.map((column) => (
            <div
              key={column.id}
              className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--surface-border)] p-4"
            >
              <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-20 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            </div>
          ))}
        </div>
      ) : !selectedOpeningId ? (
        <p className="rounded-lg border border-dashed border-[var(--surface-border)] p-8 text-center text-sm text-[var(--text-muted)]">
          Select a job opening to view the candidate Kanban pipeline.
        </p>
      ) : (
        <section
          aria-label="Kanban columns"
          className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6"
        >
          {KANBAN_STAGES.map((column) => {
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
                className={`flex flex-col rounded-xl border border-[var(--surface-border)] bg-[var(--surface-subtle)] transition-colors ${
                  draggedAppId ? 'hover:border-brand-400 hover:bg-brand-50/20' : ''
                }`}
              >
                <div
                  className={`border-t-4 rounded-t-xl p-3 border-b border-[var(--surface-border)] ${column.headerColor}`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                      {column.label}
                    </h2>
                    <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)] border border-[var(--surface-border)]">
                      {columnApps.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-3 min-h-[350px]">
                  {columnApps.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--surface-border)] p-4 text-center text-xs text-[var(--text-muted)]">
                      No candidates in {column.label}
                    </div>
                  ) : (
                    columnApps.map((app) => {
                      const isUpdating = updatingId === app.applicationId;
                      return (
                        <Card
                          key={app.applicationId}
                          draggable={!isUpdating}
                          onDragStart={(e) => {
                            setDraggedAppId(app.applicationId);
                            e.dataTransfer.setData('text/plain', app.applicationId);
                          }}
                          onDragEnd={() => setDraggedAppId(null)}
                          className={`cursor-grab p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
                            isUpdating ? 'opacity-50 pointer-events-none' : ''
                          } ${draggedAppId === app.applicationId ? 'ring-2 ring-brand-500 opacity-60' : ''}`}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-sm text-[var(--text)]">
                                {app.studentName ?? `Student ${app.studentId.slice(0, 8)}`}
                              </span>
                              {app.matchScore !== null ? (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {Math.round(app.matchScore * 100)}% Match
                                </span>
                              ) : null}
                            </div>

                            {app.studentEmail ? (
                              <p className="text-xs text-[var(--text-muted)] truncate">
                                {app.studentEmail}
                              </p>
                            ) : null}

                            {app.primaryTrackCode ? (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="rounded bg-[var(--surface-subtle)] px-2 py-0.5 font-medium text-[var(--text-muted)] border border-[var(--surface-border)]">
                                  {app.primaryTrackCode}
                                </span>
                              </div>
                            ) : null}

                            {/* Dropdown selector for quick stage change (accessibility keyboard support) */}
                            <div className="mt-2 flex items-center justify-between pt-2 border-t border-[var(--surface-border)]">
                              <label className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <span>Stage:</span>
                                <select
                                  aria-label={`Change stage for ${app.studentName ?? app.studentId}`}
                                  className="rounded border border-[var(--surface-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--text)] focus:outline-none"
                                  value={app.stage}
                                  onChange={(e) =>
                                    void handleMoveStage(
                                      app.applicationId,
                                      e.target.value as AtsStage,
                                    )
                                  }
                                  disabled={isUpdating}
                                >
                                  {KANBAN_STAGES.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
