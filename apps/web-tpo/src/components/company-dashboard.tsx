'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import type { ApplicationDto, JobOpeningDto } from '@smart/contracts';
import { Alert, Button, DashboardPanel } from '@smart/ui';
import { applicationsApi, openingsApi } from '../lib/api';
import {
  PIPELINE_LABELS,
  activeOpenings,
  countApplicationsByStage,
  countNewMatches,
  pipelineStages,
  recentMatches,
} from '../lib/company-dashboard';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

function TotalCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function formatMatchScore(score: number | null): string | null {
  if (score === null) return null;
  return `${Math.round(score * 100)}% match`;
}

type SectionError = string | null;

export function CompanyDashboard() {
  const [openings, setOpenings] = useState<JobOpeningDto[] | null>(null);
  const [applications, setApplications] = useState<ApplicationDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingsError, setOpeningsError] = useState<SectionError>(null);
  const [pipelineError, setPipelineError] = useState<SectionError>(null);

  async function load() {
    setLoading(true);
    setOpeningsError(null);
    setPipelineError(null);

    try {
      const listed = await openingsApi.list();
      setOpenings(listed.openings);
      try {
        const lists = await Promise.all(
          listed.openings.map((opening) => applicationsApi.listForOpening(opening.openingId)),
        );
        setApplications(lists.flatMap((list) => list.applications));
      } catch (caught) {
        setApplications(null);
        setPipelineError(errorMessage(caught, 'Could not load applications.'));
      }
    } catch (caught) {
      setOpenings(null);
      setApplications(null);
      setOpeningsError(errorMessage(caught, 'Could not load job openings.'));
      setPipelineError(errorMessage(caught, 'Could not load job openings.'));
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const active = openings ? activeOpenings(openings) : [];
  const newMatchCount = applications ? countNewMatches(applications) : 0;
  const stageCounts = applications ? countApplicationsByStage(applications) : null;
  const recent = openings && applications ? recentMatches(applications, openings) : [];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            TPO Concierge · CO-T04
          </p>
          <h1 className="text-2xl font-bold text-[var(--text)]">Company dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Live openings and ATS snapshot for this institution. JWT institution scope is enforced
            by the CO-T01 and CO-T02 APIs — this page never sends a client institution id.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </header>

      {loading ? (
        <div aria-live="polite" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <p>Loading company dashboard…</p>
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="h-28 animate-pulse rounded-2xl border border-[var(--surface-border)] bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <>
          <section aria-label="Company totals" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TotalCard
              label="Active openings"
              value={openingsError ? 0 : active.length}
              hint="JobOpeningStatus.OPEN from /placement/openings"
            />
            <TotalCard
              label="New matches"
              value={pipelineError ? 0 : newMatchCount}
              hint="AtsStage.APPLIED — CO-T02 Applied / New Matches"
            />
            <TotalCard
              label="Pipeline candidates"
              value={pipelineError ? 0 : (applications?.length ?? 0)}
              hint="Applications from /placement/openings/:id/applications"
            />
          </section>

          {openingsError ? (
            <Alert tone="danger" title="Could not load job openings">
              {openingsError}
            </Alert>
          ) : null}

          {pipelineError && !openingsError ? (
            <Alert tone="danger" title="Could not load applications">
              {pipelineError}
            </Alert>
          ) : null}

          <section aria-label="Active openings">
            {openingsError ? null : active.length === 0 ? (
              <DashboardPanel
                title="Active openings"
                description="Only JobOpeningStatus.OPEN is counted. CO-T01 create writes DRAFT and there is no publish API on this ticket."
              >
                <p className="text-sm text-[var(--text-muted)]">
                  {openings && openings.length > 0
                    ? 'No OPEN openings. Draft or closed JDs are listed under Job openings.'
                    : 'No openings posted yet.'}
                </p>
                <p className="mt-3 text-sm">
                  <Link href="/openings" className="underline">
                    Post a structured job opening
                  </Link>
                </p>
              </DashboardPanel>
            ) : (
              <DashboardPanel
                title="Active openings"
                description="Live CO-T01 rows with status OPEN."
              >
                <ul className="space-y-3 text-sm">
                  {active.map((opening) => (
                    <li
                      key={opening.openingId}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium">{opening.roleTitle}</p>
                        <p className="text-[var(--text-muted)]">
                          {opening.companyName} · {opening.location} · {opening.headcount} headcount
                        </p>
                      </div>
                      <Link href="/ats" className="underline">
                        Open ATS
                      </Link>
                    </li>
                  ))}
                </ul>
              </DashboardPanel>
            )}
          </section>

          <section aria-label="Pipeline overview">
            {pipelineError ? null : !stageCounts || applications?.length === 0 ? (
              <DashboardPanel
                title="Pipeline overview"
                description="Canonical AtsStage counts from CO-T02. AI-Verified and Hired are not contract stages."
              >
                <p className="text-sm text-[var(--text-muted)]">
                  No applications yet. Shortlist a candidate to populate the ATS.
                </p>
              </DashboardPanel>
            ) : (
              <DashboardPanel
                title="Pipeline overview"
                description="Canonical AtsStage counts from CO-T02. AI-Verified and Hired are not contract stages."
              >
                <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {pipelineStages().map((stage) => (
                    <li
                      key={stage}
                      className="rounded-xl border border-[var(--surface-border)] p-3"
                    >
                      <p className="text-xs text-[var(--text-muted)]">{PIPELINE_LABELS[stage]}</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {stageCounts[stage]}
                      </p>
                    </li>
                  ))}
                </ol>
              </DashboardPanel>
            )}
          </section>

          <section aria-label="Recent matches">
            {pipelineError ? null : recent.length === 0 ? (
              <DashboardPanel
                title="Recent matches"
                description="Newest Application.createdAt rows joined to the CO-T01 opening. SE-T05 ranked suggestions are not persisted until shortlist."
              >
                <p className="text-sm text-[var(--text-muted)]">No recent matches yet.</p>
              </DashboardPanel>
            ) : (
              <DashboardPanel
                title="Recent matches"
                description="Newest Application.createdAt rows joined to the CO-T01 opening. SE-T05 ranked suggestions are not persisted until shortlist."
              >
                <ul className="space-y-3 text-sm">
                  {recent.map((match) => {
                    const score = formatMatchScore(match.matchScore);
                    return (
                      <li
                        key={match.applicationId}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium">{match.studentName}</p>
                          <p className="text-[var(--text-muted)]">
                            {match.roleTitle} · {match.companyName} · {PIPELINE_LABELS[match.stage]}
                            {score ? ` · ${score}` : ''}
                          </p>
                        </div>
                        <time
                          className="tabular-nums text-[var(--text-muted)]"
                          dateTime={match.createdAt}
                        >
                          {match.createdAt}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              </DashboardPanel>
            )}
          </section>
        </>
      )}
    </main>
  );
}
