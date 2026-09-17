'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ApplicationDto, JobOpeningDto } from '@smart/contracts';
import { Alert } from '@smart/ui';
import { applicationsApi, openingsApi } from '../lib/api';
import { tpoApiErrorMessage } from '../lib/api-errors';
import {
  PIPELINE_LABELS,
  activeOpenings,
  countApplicationsByStage,
  countNewMatches,
  pipelineStages,
  recentMatches,
} from '../lib/company-dashboard';
import {
  cardClass,
  mutedTextClass,
  secondaryButtonClass,
  secondaryButtonSmClass,
  sectionLabelClass,
  sectionTitleClass,
  surfaceClass,
} from '../lib/tpo-ui';
import { PlacementPageHeader } from './placement/PlacementPageHeader';

function TotalCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className={cardClass}>
      <p className={`text-sm ${mutedTextClass}`}>{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--ds-text)]">{value}</p>
      <p className={`mt-1 text-xs ${mutedTextClass}`}>{hint}</p>
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
          listed.openings.map((opening: JobOpeningDto) =>
            applicationsApi.listForOpening(opening.openingId),
          ),
        );
        setApplications(lists.flatMap((list) => list.applications));
      } catch (caught) {
        setApplications(null);
        setPipelineError(tpoApiErrorMessage(caught, 'Could not load applications.'));
      }
    } catch (caught) {
      setOpenings(null);
      setApplications(null);
      setOpeningsError(tpoApiErrorMessage(caught, 'Could not load job openings.'));
      setPipelineError(tpoApiErrorMessage(caught, 'Could not load job openings.'));
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
    <>
      <PlacementPageHeader
        eyebrow="Placement · Insights"
        title="Company dashboard"
        description="A live view of active drives, fresh matches, and pipeline momentum across your campus recruiters."
        actions={
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </button>
        }
      />

      {loading ? (
        <div aria-live="polite" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <p>Loading company dashboard…</p>
          {[1, 2, 3].map((slot) => (
            <div key={slot} className={`${cardClass} h-28 animate-pulse`} />
          ))}
        </div>
      ) : (
        <>
          <section aria-label="Company totals" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TotalCard
              label="Active openings"
              value={openingsError ? 0 : active.length}
              hint="Roles currently open to students"
            />
            <TotalCard
              label="New matches"
              value={pipelineError ? 0 : newMatchCount}
              hint="Candidates who recently applied"
            />
            <TotalCard
              label="Pipeline candidates"
              value={pipelineError ? 0 : (applications?.length ?? 0)}
              hint="Everyone in your ATS funnel"
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

          <section aria-label="Active openings" className={cardClass}>
            <h2 className={sectionTitleClass}>Active openings</h2>
            <p className={`mt-1 text-sm ${mutedTextClass}`}>
              {openingsError
                ? null
                : active.length === 0
                  ? 'Published drives appear here once an opening is live for students.'
                  : 'Openings accepting applications right now.'}
            </p>
            {openingsError ? null : active.length === 0 ? (
              <div className="mt-4">
                <p className={`text-sm ${mutedTextClass}`}>
                  {openings && openings.length > 0
                    ? 'No OPEN openings. Draft or closed JDs are listed under Job openings.'
                    : 'No openings posted yet.'}
                </p>
                <p className="mt-3 text-sm">
                  <Link
                    href="/openings"
                    className="font-semibold text-[var(--ds-green)] hover:underline"
                  >
                    Post a structured job opening
                  </Link>
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {active.map((opening) => (
                  <li
                    key={opening.openingId}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ds-border-subtle)] pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="font-medium text-[var(--ds-text)]">{opening.roleTitle}</p>
                      <p className={mutedTextClass}>
                        {opening.companyName} · {opening.location}
                      </p>
                    </div>
                    <Link href="/ats" className={secondaryButtonSmClass}>
                      Open ATS
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Pipeline overview" className={cardClass}>
            <h2 className={sectionTitleClass}>Pipeline overview</h2>
            <p className={`mt-1 text-sm ${mutedTextClass}`}>
              Where candidates sit across each hiring stage.
            </p>
            {pipelineError ? null : !stageCounts || applications?.length === 0 ? (
              <p className={`mt-4 text-sm ${mutedTextClass}`}>
                No applications yet. Shortlist a candidate to populate the ATS.
              </p>
            ) : (
              <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                {pipelineStages().map((stage) => (
                  <li key={stage} className={`${surfaceClass} p-3`}>
                    <p className={sectionLabelClass}>{PIPELINE_LABELS[stage]}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ds-text)]">
                      {stageCounts[stage]}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-label="Recent matches" className={cardClass}>
            <h2 className={sectionTitleClass}>Recent matches</h2>
            <p className={`mt-1 text-sm ${mutedTextClass}`}>
              The latest students matched to your open roles.
            </p>
            {pipelineError ? null : recent.length === 0 ? (
              <p className={`mt-4 text-sm ${mutedTextClass}`}>No recent matches yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {recent.map((match) => {
                  const score = formatMatchScore(match.matchScore);
                  return (
                    <li
                      key={match.applicationId}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ds-border-subtle)] pt-3 first:border-t-0 first:pt-0"
                    >
                      <div>
                        <p className="font-medium text-[var(--ds-text)]">{match.studentName}</p>
                        <p className={mutedTextClass}>
                          {match.roleTitle} · {match.companyName} · {PIPELINE_LABELS[match.stage]}
                          {score ? ` · ${score}` : ''}
                        </p>
                      </div>
                      <time className={`tabular-nums ${mutedTextClass}`} dateTime={match.createdAt}>
                        {match.createdAt}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
