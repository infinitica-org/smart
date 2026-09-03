'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import {
  ATS_STAGES,
  SKILL_CLAIM_STATUSES,
  type ApplicationDto,
  type BatchDto,
  type InstitutionStudentDto,
  type JobOpeningDto,
  type SkillClaimDto,
} from '@smart/contracts';
import { Alert, Button, DashboardPanel } from '@smart/ui';
import { api, applicationsApi, openingsApi } from '../lib/api';
import {
  PIPELINE_LABELS,
  countApplicationsByStage,
  countInviteSnapshot,
  countSkillClaimsByStatus,
  sortBatchesByName,
} from '../lib/academia-dashboard';

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

type SectionError = string | null;

export function AcademiaDashboard() {
  const [students, setStudents] = useState<InstitutionStudentDto[] | null>(null);
  const [batches, setBatches] = useState<BatchDto[] | null>(null);
  const [claims, setClaims] = useState<SkillClaimDto[] | null>(null);
  const [applications, setApplications] = useState<ApplicationDto[] | null>(null);
  const [openingCount, setOpeningCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<SectionError>(null);
  const [batchesError, setBatchesError] = useState<SectionError>(null);
  const [claimsError, setClaimsError] = useState<SectionError>(null);
  const [pipelineError, setPipelineError] = useState<SectionError>(null);

  async function load() {
    setLoading(true);
    setStudentsError(null);
    setBatchesError(null);
    setClaimsError(null);
    setPipelineError(null);

    const [studentResult, batchResult, claimResult, openingResult] = await Promise.allSettled([
      api.onboarding.listTpoStudents(),
      api.onboarding.listBatches(),
      api.assessment.listSkillClaims(),
      openingsApi.list(),
    ]);

    if (studentResult.status === 'fulfilled') {
      setStudents(studentResult.value);
    } else {
      setStudents(null);
      setStudentsError(errorMessage(studentResult.reason, 'Could not load students.'));
    }

    if (batchResult.status === 'fulfilled') {
      setBatches(batchResult.value);
    } else {
      setBatches(null);
      setBatchesError(errorMessage(batchResult.reason, 'Could not load batches.'));
    }

    if (claimResult.status === 'fulfilled') {
      setClaims(claimResult.value);
    } else {
      setClaims(null);
      setClaimsError(errorMessage(claimResult.reason, 'Could not load skill claims.'));
    }

    if (openingResult.status === 'fulfilled') {
      const openings = openingResult.value.openings;
      setOpeningCount(openings.length);
      try {
        const lists = await Promise.all(
          openings.map((opening: JobOpeningDto) =>
            applicationsApi.listForOpening(opening.openingId),
          ),
        );
        setApplications(lists.flatMap((list) => list.applications));
      } catch (caught) {
        setApplications(null);
        setPipelineError(errorMessage(caught, 'Could not load applications.'));
      }
    } else {
      setOpeningCount(0);
      setApplications(null);
      setPipelineError(errorMessage(openingResult.reason, 'Could not load job openings.'));
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const invite = students ? countInviteSnapshot(students) : null;
  const claimCounts = claims ? countSkillClaimsByStatus(claims) : null;
  const stageCounts = applications ? countApplicationsByStage(applications) : null;
  const roster = batches ? sortBatchesByName(batches) : [];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            TPO Concierge · AC-T07
          </p>
          <h1 className="text-2xl font-bold text-[var(--text)]">Academia dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Live institution snapshot from batch provisioning, skill claims, and the ATS. JWT
            institution scope is enforced by each source API.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </header>

      {loading ? (
        <div aria-live="polite" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <p>Loading academia dashboard…</p>
          {[1, 2, 3, 4].map((slot) => (
            <div
              key={slot}
              className="h-28 animate-pulse rounded-2xl border border-[var(--surface-border)] bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <>
          <section
            aria-label="Institution totals"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <TotalCard label="Students" value={invite?.total ?? 0} hint="From /tpo/students" />
            <TotalCard label="Batches" value={batches?.length ?? 0} hint="From /tpo/batches" />
            <TotalCard label="Job openings" value={openingCount} hint="From /placement/openings" />
            <TotalCard
              label="Verified claims"
              value={claimCounts?.VERIFIED ?? 0}
              hint="From /assessment/skill-claims"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <DashboardPanel
              title="Profile completion"
              description="Student onboarding completion is not on the TPO student list contract."
            >
              <Alert tone="warning" title="Metric not available">
                InstitutionStudentDto exposes invite and hold state, not a profile-completion
                percent. Invite acceptance from AC-T01 / AC-T02 is shown instead.
              </Alert>
              {studentsError ? (
                <Alert tone="danger" title="Could not load students" className="mt-4">
                  {studentsError}
                </Alert>
              ) : !invite || invite.total === 0 ? (
                <p className="mt-4 text-sm text-[var(--text-muted)]">
                  No students in this institution yet.
                </p>
              ) : (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-[var(--text-muted)]">Accepted</dt>
                    <dd className="text-lg font-semibold tabular-nums">{invite.accepted}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Pending</dt>
                    <dd className="text-lg font-semibold tabular-nums">{invite.pending}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">No invite</dt>
                    <dd className="text-lg font-semibold tabular-nums">{invite.none}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Expired</dt>
                    <dd className="text-lg font-semibold tabular-nums">{invite.expired}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Revoked</dt>
                    <dd className="text-lg font-semibold tabular-nums">{invite.revoked}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">On hold</dt>
                    <dd className="text-lg font-semibold tabular-nums">{invite.held}</dd>
                  </div>
                </dl>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Skill verification snapshot"
              description="Institution-scoped SkillClaim rows. Statuses are the contract enum only."
            >
              {claimsError ? (
                <Alert tone="danger" title="Could not load skill claims">
                  {claimsError}
                </Alert>
              ) : !claimCounts || claims?.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No skill claims on file yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {SKILL_CLAIM_STATUSES.map((status) => (
                    <li key={status} className="flex items-center justify-between">
                      <span>{status.replaceAll('_', ' ')}</span>
                      <span className="tabular-nums text-[var(--text-muted)]">
                        {claimCounts[status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </section>

          <section aria-label="Placement pipeline">
            {pipelineError ? (
              <Alert tone="danger" title="Could not load placement pipeline">
                {pipelineError}
              </Alert>
            ) : !stageCounts || applications?.length === 0 ? (
              <DashboardPanel
                title="Placement pipeline"
                description="Canonical ATS stages from Applications created by AC-T05 / AC-T06."
              >
                <p className="text-sm text-[var(--text-muted)]">
                  No applications yet. Shortlist candidates to populate the pipeline.
                </p>
              </DashboardPanel>
            ) : (
              <DashboardPanel
                title="Placement pipeline"
                description="Canonical ATS stages from Applications created by AC-T05 / AC-T06."
              >
                <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  {ATS_STAGES.map((stage) => (
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

          <section className="grid gap-6 lg:grid-cols-2">
            <DashboardPanel
              title="Batch readiness"
              description="Gold/Silver/Bronze cohort-readiness is not implemented. Showing AC-T01 roster counts."
            >
              {batchesError ? (
                <Alert tone="danger" title="Could not load batches">
                  {batchesError}
                </Alert>
              ) : roster.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No batches created yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {roster.map((batch) => (
                    <li key={batch.batchId} className="flex items-center justify-between gap-3">
                      <Link href={`/batches/${batch.batchId}`} className="underline">
                        {batch.name}
                      </Link>
                      <span className="tabular-nums text-[var(--text-muted)]">
                        {batch.memberCount} members · {batch.pendingInviteCount} pending invites
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Skill-gap list"
              description="GET /analytics/gap-report is still a scaffold. No batch gap metric is invented here."
            >
              <Alert tone="info" title="Skill-gap report not available">
                Ranked competency gaps require the analytics gap-report API. Use{' '}
                <Link href="/suggestions" className="underline">
                  Ranked suggestions
                </Link>{' '}
                to read SE-T05 gapCompetencies per job opening.
              </Alert>
            </DashboardPanel>
          </section>
        </>
      )}
    </main>
  );
}
