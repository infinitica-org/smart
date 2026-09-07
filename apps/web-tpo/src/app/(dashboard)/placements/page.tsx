'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSmartApiError } from '@smart/api-client';
import type { JobOpeningDto, JobOpeningStatus } from '@smart/contracts';
import { Alert, Card, Button } from '@smart/ui';
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
import { applicationsApi, openingsApi } from '../../../lib/api';

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

  return (
    <main className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">JD Inbox</h2>
          <p className="text-slate-500 text-sm mt-1">
            Review incoming Job Descriptions from partner companies and match your candidates.
          </p>
        </div>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or companies..."
            className="w-full bg-slate-50 text-slate-900 text-sm rounded-lg py-2 pl-10 pr-4 border border-slate-200 focus:outline-none focus:border-[#004c63] focus:ring-1 focus:ring-[#004c63] transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobOpeningStatus | 'ALL')}
            className="bg-slate-50 text-slate-700 text-sm rounded-lg border border-slate-200 px-4 py-2 focus:outline-none focus:border-[#004c63]"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Button
            type="button"
            variant="secondary"
            className="bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center gap-2 font-medium"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {error ? (
        <Alert tone="danger" title="Openings unavailable">
          {error}
        </Alert>
      ) : loading ? (
        <p role="status" className="text-sm text-slate-500">
          Loading job descriptions…
        </p>
      ) : filtered.length === 0 ? (
        <Card className="bg-white border-slate-200 shadow-sm p-8 text-center text-sm text-slate-500 rounded-xl">
          No job descriptions yet.{' '}
          <Link href="/openings" className="text-[#004c63] font-semibold hover:underline">
            Post a structured JD
          </Link>{' '}
          to get started.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((jd) => (
            <Link key={jd.openingId} href={`/openings?openingId=${jd.openingId}`}>
              <Card className="bg-white border-slate-200 shadow-sm p-5 hover:border-[#004c63]/40 transition-all hover:shadow-md cursor-pointer group relative overflow-hidden rounded-xl">
                {jd.status === 'DRAFT' && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-4 -right-6 w-24 bg-slate-200 text-slate-700 text-[10px] font-bold py-1 text-center rotate-45 transform">
                      DRAFT
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#004c63]/10 border border-[#004c63]/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#004c63] group-hover:text-white transition-colors">
                      <Briefcase className="w-6 h-6 text-[#004c63] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#004c63] transition-colors">
                        {jd.roleTitle}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" /> {jd.companyName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {jd.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />{' '}
                          {labelFor(jd.employmentType)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-slate-900">
                        {jd.matchCount ?? '—'} Applications
                      </div>
                      <div className="text-xs text-slate-400">{relativeTime(jd.createdAt)}</div>
                    </div>

                    {jd.status === 'OPEN' && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                        Open
                      </span>
                    )}
                    {jd.status === 'CLOSED' && (
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Closed
                      </span>
                    )}

                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#004c63] transition-colors" />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
                  {jd.requiredSkills.slice(0, 6).map((skill) => (
                    <span
                      key={skill.skillCode}
                      className="bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium px-2.5 py-1 rounded-md text-xs"
                    >
                      {skill.skillCode}
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
