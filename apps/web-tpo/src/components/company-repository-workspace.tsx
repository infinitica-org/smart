'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { JobOpeningDto } from '@smart/contracts';
import { Alert } from '@smart/ui';
import { openingsApi } from '../lib/api';
import { tpoApiErrorMessage } from '../lib/api-errors';
import { aggregateCampusCompanies, type CampusCompanyRow } from '../lib/company-repository';
import {
  cardClass,
  mutedTextClass,
  secondaryButtonClass,
  sectionTitleClass,
  surfaceClass,
} from '../lib/tpo-ui';
import { PlacementPageHeader } from './placement/PlacementPageHeader';

function CompanyCard({ row }: { row: CampusCompanyRow }) {
  return (
    <li className={`${surfaceClass} flex flex-col gap-3 p-4`}>
      <div className="flex items-start gap-3">
        {row.companyLogoUrl ? (
          <img
            src={row.companyLogoUrl}
            alt=""
            className="size-12 shrink-0 rounded-lg border border-[var(--ds-border-subtle)] object-contain bg-[var(--ds-surface)] p-1"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] text-sm font-semibold text-[var(--ds-text-muted)]"
          >
            {row.companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[var(--ds-text)]">
            {row.companyName}
          </p>
          <p className={`mt-0.5 text-sm ${mutedTextClass}`}>
            {row.openingCount} posting{row.openingCount === 1 ? '' : 's'}
            {row.activeOpenings > 0 ? ` · ${row.activeOpenings} live` : ''}
          </p>
          {row.locations.length > 0 ? (
            <p className={`mt-1 text-xs ${mutedTextClass}`}>{row.locations.join(' · ')}</p>
          ) : null}
        </div>
      </div>
      <p className={`text-xs ${mutedTextClass}`}>
        Last on campus{' '}
        <time dateTime={row.lastEngagementAt}>
          {new Date(row.lastEngagementAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </time>
      </p>
    </li>
  );
}

export function CompanyRepositoryWorkspace() {
  const [openings, setOpenings] = useState<JobOpeningDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const listed = await openingsApi.list();
      setOpenings(listed.openings);
    } catch (caught) {
      setOpenings(null);
      setError(tpoApiErrorMessage(caught, 'Could not load company records.'));
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const companies = openings ? aggregateCampusCompanies(openings) : [];

  return (
    <>
      <PlacementPageHeader
        eyebrow="Placement"
        title="Company repository"
        description="Every organization that has posted through your placement desk — built from live job openings, not sample data."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </button>
            <Link href="/openings/create" className={secondaryButtonClass}>
              Create job posting
            </Link>
          </div>
        }
      />

      {error ? (
        <Alert tone="danger" title="Could not load companies">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <p aria-live="polite" className={`text-sm ${mutedTextClass}`}>
          Loading company repository…
        </p>
      ) : companies.length === 0 ? (
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>No companies yet</h2>
          <p className={`mt-2 text-sm ${mutedTextClass}`}>
            When you publish job postings, each recruiter appears here automatically.
          </p>
          <p className="mt-4">
            <Link
              href="/openings/create"
              className="text-sm font-semibold text-[var(--ds-green)] hover:underline"
            >
              Create your first job posting
            </Link>
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {companies.map((row) => (
            <CompanyCard key={row.companyName} row={row} />
          ))}
        </ul>
      )}
    </>
  );
}
