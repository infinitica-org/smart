'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import type { JobOpeningDto, JobOpeningStatus } from '@smart/contracts';
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { TpoBentoPageHeader } from '../../../components/tpo-bento/TpoBentoPageHeader';
import { applicationsApi, openingsApi } from '../../../lib/api';
import {
  bentoCardClass,
  bentoChipClass,
  bentoPageStackClass,
  bentoToolbarClass,
  dashboardAccentStyles,
  dashboardErrorNoticeClass,
  dashboardMintBadgeClass,
  dashboardPillClass,
  dashboardSkeletonClass,
} from '../../../lib/tpo-dashboard-ui';
import { inputClass, secondaryButtonClass, selectClass } from '../../../lib/tpo-ui';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${String(days)} day${days === 1 ? '' : 's'} ago`;
}

function labelFor(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

type OpeningRow = JobOpeningDto & { matchCount: number | null };

export default function PlacementsPage() {
  const [openings, setOpenings] = useState<OpeningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobOpeningStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    openingsApi
      .list(statusFilter === 'ALL' ? undefined : { status: statusFilter })
      .then(async (res) => {
        if (cancelled) return;
        const withCounts = await Promise.all(
          res.openings.map(async (opening) => {
            try {
              const applications = await applicationsApi.listForOpening(opening.openingId);
              return { ...opening, matchCount: applications.applications.length };
            } catch {
              return { ...opening, matchCount: null };
            }
          }),
        );
        if (!cancelled) setOpenings(withCounts);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught, 'Could not load job descriptions.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const filtered = openings.filter((jd) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      jd.roleTitle.toLowerCase().includes(query) || jd.companyName.toLowerCase().includes(query)
    );
  });

  const blue = dashboardAccentStyles.blue;

  return (
    <div className={bentoPageStackClass}>
      <TpoBentoPageHeader
        title="JD Inbox"
        description="Review incoming Job Descriptions from partner companies and match your candidates."
        icon={Briefcase}
        accent="mint"
      />

      <div className={`${bentoToolbarClass} flex flex-col gap-3 md:flex-row md:items-center`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-subtle)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or companies..."
            className={`${inputClass} pl-9 text-[13px]`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobOpeningStatus | 'ALL')}
            className={`${selectClass} text-[13px]`}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button type="button" className={`${secondaryButtonClass} text-[13px]`}>
            <Filter className="size-4 text-[var(--ds-text-muted)]" />
            Apply Filters
          </button>
        </div>
      </div>

      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}

      {loading ? (
        <div className={`${dashboardSkeletonClass} h-32 w-full rounded-[20px]`} role="status">
          Loading job descriptions…
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${bentoCardClass} text-center text-[13px] text-[var(--ds-text-muted)]`}>
          No job descriptions yet.{' '}
          <Link href="/openings" className="font-semibold text-[var(--ds-link)] hover:underline">
            Post a structured JD
          </Link>{' '}
          to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((jd) => (
            <Link key={jd.openingId} href={`/openings?openingId=${jd.openingId}`}>
              <article className={`${bentoCardClass} group cursor-pointer ${blue.cardWash}`}>
                {jd.status === 'DRAFT' ? (
                  <span className="absolute right-4 top-4 rounded-full bg-[var(--ds-surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                    Draft
                  </span>
                ) : null}
                <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${blue.iconWrap} group-hover:bg-[var(--tpo-dash-accent-blue)] group-hover:text-white`}
                    >
                      <Briefcase className="size-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--ds-text)]">
                        {jd.roleTitle}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[var(--ds-text-muted)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-3.5" /> {jd.companyName}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3.5" /> {jd.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" /> {labelFor(jd.employmentType)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <div className="text-sm font-semibold text-[var(--ds-text)]">
                        {jd.matchCount ?? '—'} Applications
                      </div>
                      <div className="text-xs text-[var(--ds-text-muted)]">
                        {relativeTime(jd.createdAt)}
                      </div>
                    </div>
                    {jd.status === 'OPEN' ? (
                      <span className={dashboardMintBadgeClass}>Open</span>
                    ) : null}
                    {jd.status === 'CLOSED' ? (
                      <span className={bentoChipClass}>
                        <CheckCircle2 className="size-3.5" /> Closed
                      </span>
                    ) : null}
                    <ChevronRight className="size-5 text-[var(--ds-text-subtle)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--tpo-dash-accent-blue)]" />
                  </div>
                </div>
                <div className="relative mt-4 flex flex-wrap gap-2 border-t border-[var(--ds-border-subtle)] pt-4">
                  {jd.requiredSkills.slice(0, 6).map((skill) => (
                    <span key={skill.skillCode} className={dashboardPillClass}>
                      {skill.skillCode}
                    </span>
                  ))}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
