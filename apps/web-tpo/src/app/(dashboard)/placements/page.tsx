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
          <h2 className="text-2xl font-semibold tracking-tight text-white">JD Inbox</h2>
          <p className="text-gray-400 text-sm mt-1">
            Review incoming Job Descriptions from partner companies and match your candidates.
          </p>
        </div>
      </div>

      <Card className="bg-[#131313] border-white/5 p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or companies..."
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobOpeningStatus | 'ALL')}
            className="bg-[#1a1a1a] text-gray-300 text-sm rounded-lg border border-white/5 px-4 focus:outline-none focus:border-[#00fad0]/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Button
            type="button"
            variant="secondary"
            className="bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {error ? (
        <Alert tone="danger" title="Openings unavailable">
          {error}
        </Alert>
      ) : loading ? (
        <p role="status" className="text-sm text-gray-400">
          Loading job descriptions…
        </p>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#131313] border-white/5 p-8 text-center text-sm text-gray-400">
          No job descriptions yet.{' '}
          <Link href="/openings" className="text-[#00fad0] hover:underline">
            Post a structured JD
          </Link>{' '}
          to get started.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((jd) => (
            <Link key={jd.openingId} href={`/openings?openingId=${jd.openingId}`}>
              <Card className="bg-[#131313] border-white/5 p-5 hover:border-white/20 transition-all hover:bg-white/[0.02] cursor-pointer group relative overflow-hidden">
                {jd.status === 'DRAFT' && (
                  <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                    <div className="absolute top-4 -right-6 w-24 bg-[#00fad0] text-white text-[10px] font-bold py-1 text-center rotate-45 transform">
                      DRAFT
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#00fad0]/10 group-hover:text-[#00fad0] transition-colors">
                      <Briefcase className="w-6 h-6 text-gray-400 group-hover:text-[#00fad0]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-[#00fad0] transition-colors">
                        {jd.roleTitle}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> {jd.companyName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> {jd.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {labelFor(jd.employmentType)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-white">
                        {jd.matchCount ?? '—'} Applications
                      </div>
                      <div className="text-xs text-gray-500">{relativeTime(jd.createdAt)}</div>
                    </div>

                    {jd.status === 'OPEN' && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                        Open
                      </span>
                    )}
                    {jd.status === 'CLOSED' && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                      </span>
                    )}

                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                  {jd.requiredSkills.slice(0, 6).map((skill) => (
                    <span
                      key={skill.skillCode}
                      className="bg-white/5 text-gray-300 px-2 py-1 rounded text-xs"
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
