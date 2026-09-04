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
    <main className="mx-auto max-w-[1400px] space-y-6 p-6 font-sans select-none pb-12">
      {/* Header Bar */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#004C63]/10 text-[#004C63] text-xs font-bold mb-2 border border-[#004C63]/20">
            TPO Concierge · ATS
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Candidate ATS Kanban Board
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-500 font-medium">
            Manage candidate progression dynamically across placement pipeline recruitment stages.
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-xs text-slate-600 font-medium shadow-xs flex flex-wrap gap-6 items-center">
          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block text-slate-400">
              Role
            </span>
            <span className="font-bold text-slate-900 text-sm">{selectedOpening.roleTitle}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block text-slate-400">
              Company
            </span>
            <span className="font-bold text-slate-900 text-sm">{selectedOpening.companyName}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block text-slate-400">
              Headcount
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {selectedOpening.headcount} position(s)
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block text-slate-400">
              Location
            </span>
            <span className="font-bold text-slate-900 text-sm">{selectedOpening.location}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block text-slate-400">
              Total Applicants
            </span>
            <span className="font-bold text-[#004C63] text-sm">
              {applications.length} candidates
            </span>
          </div>
        </div>
      ) : null}

      {loadingApps || loadingOpenings ? (
        <div role="status" className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {KANBAN_STAGES.map((column) => (
            <div
              key={column.id}
              className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 p-4 bg-white/50"
            >
              <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : !selectedOpeningId ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm font-medium text-slate-500 bg-white">
          Select a job opening above to view the candidate Kanban pipeline.
        </div>
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
                className={`flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/50 transition-all ${
                  draggedAppId ? 'hover:border-[#004C63] hover:bg-[#F0FDFA]/50' : ''
                }`}
              >
                <div
                  className={`border-t-4 rounded-t-2xl p-3 border-b border-slate-200/70 bg-white ${column.headerColor}`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      {column.label}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-700 border border-slate-200">
                      {columnApps.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-3 min-h-[380px]">
                  {columnApps.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-medium text-slate-400">
                      No candidates
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
                          className={`cursor-grab p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all hover:shadow-md hover:border-slate-300 active:cursor-grabbing ${
                            isUpdating ? 'opacity-50 pointer-events-none' : ''
                          } ${draggedAppId === app.applicationId ? 'ring-2 ring-[#004C63] opacity-60' : ''}`}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-bold text-xs text-slate-900 leading-tight">
                                {app.studentName ?? `Student ${app.studentId.slice(0, 8)}`}
                              </span>
                              {app.matchScore !== null ? (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200 shrink-0">
                                  {Math.round(app.matchScore * 100)}% Match
                                </span>
                              ) : null}
                            </div>

                            {app.studentEmail ? (
                              <p className="text-[11px] font-medium text-slate-500 truncate">
                                {app.studentEmail}
                              </p>
                            ) : null}

                            {app.primaryTrackCode ? (
                              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200/60">
                                  {app.primaryTrackCode}
                                </span>
                              </div>
                            ) : null}

                            {/* Dropdown selector for quick stage change */}
                            <div className="mt-1.5 flex items-center justify-between pt-2 border-t border-slate-100">
                              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 w-full justify-between">
                                <span>Move Stage:</span>
                                <select
                                  aria-label={`Change stage for ${app.studentName ?? app.studentId}`}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#004C63]"
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
