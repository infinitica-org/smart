'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { BatchDto, CampusDto } from '@smart/contracts';
import { LayoutGrid, Loader2, MapPin, Plus, Search, Users, Clock } from 'lucide-react';
import { TpoBentoPageHeader } from '../tpo-bento/TpoBentoPageHeader';
import { api } from '../../lib/api';

function matchesBatchQuery(batch: BatchDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    batch.name.toLowerCase().includes(q) ||
    (batch.code?.toLowerCase().includes(q) ?? false) ||
    batch.batchId.toLowerCase().includes(q)
  );
}

export function BatchesWorkspace() {
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  // S6-VV-112 — '' means the primary campus (create) or every campus (filter).
  const [campuses, setCampuses] = useState<CampusDto[]>([]);
  const [campusId, setCampusId] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          matchesBatchQuery(batch, searchQuery) &&
          (!campusFilter || batch.campusId === campusFilter),
      ),
    [batches, searchQuery, campusFilter],
  );

  const totalMembers = useMemo(
    () => batches.reduce((sum, b) => sum + (b.memberCount || 0), 0),
    [batches],
  );

  const totalPendingInvites = useMemo(
    () => batches.reduce((sum, b) => sum + (b.pendingInviteCount || 0), 0),
    [batches],
  );

  async function load() {
    setLoading(true);
    try {
      setBatches(await api.onboarding.listBatches());
      setError(null);
    } catch {
      setError('Failed to load batches.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Campuses only label and filter batches, so a failure here must not hide the list.
    api.onboarding
      .listCampuses()
      .then(setCampuses)
      .catch(() => setCampuses([]));
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.onboarding.createBatch({
        name: name.trim(),
        code: code.trim() || undefined,
        campusId: campusId || undefined,
      });
      setName('');
      setCode('');
      setCampusId('');
      await load();
      setError(null);
    } catch {
      setError('Could not create batch.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pb-12">
      <TpoBentoPageHeader
        compact
        title="Batches"
        description="Group candidates into cohorts for faster filtering — graduating classes (e.g. 2025–2026), sections, or skill-focused lists you manage as a TPO."
        icon={LayoutGrid}
        badge={
          <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-100/90 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
            {batches.length} batches
          </span>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Cohorts
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {batches.length.toLocaleString('en-US')}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">Active institutional batches</p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs">
            <LayoutGrid className="size-5 stroke-[1.75]" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Enrolled Candidates
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {totalMembers.toLocaleString('en-US')}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Assigned batch members</span>
            </div>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200/80 bg-emerald-50 text-emerald-800 shadow-2xs">
            <Users className="size-5 stroke-[1.75]" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pending Invites
            </p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-zinc-900">
              {totalPendingInvites.toLocaleString('en-US')}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span>Unclaimed onboarding invites</span>
            </div>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-800 shadow-2xs">
            <Clock className="size-5 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-2xs"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] xl:gap-5">
        {/* Create Batch Card */}
        <aside className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200/80">
              <Plus className="size-4 stroke-[2]" />
            </div>
            <h2 className="text-base font-bold text-zinc-900">Create batch</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Example: Batch 2025–2026 or CSE — Advanced Python cohort.
          </p>

          <form onSubmit={onCreate} className="mt-4 space-y-3.5">
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-zinc-700"
                htmlFor="batch-name"
              >
                Batch name
              </label>
              <input
                id="batch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Batch 2025–2026"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                required
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold text-zinc-700"
                htmlFor="batch-code"
              >
                Short code <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                id="batch-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 25-26"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            {campuses.length > 1 ? (
              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold text-zinc-700"
                  htmlFor="batch-campus"
                >
                  Campus
                </label>
                <select
                  id="batch-campus"
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs text-zinc-900 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  {campuses.map((campus) => (
                    <option key={campus.campusId} value={campus.isPrimary ? '' : campus.campusId}>
                      {campus.name}
                      {campus.isPrimary ? ' (primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <>
                  <Plus className="size-4" aria-hidden /> Create batch
                </>
              )}
            </button>
          </form>
        </aside>

        {/* Batches List Section */}
        <section className="min-w-0 space-y-3">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Your batches</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Organize cohorts for placement applications and verification
                </p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-2xs transition hover:bg-zinc-50 hover:border-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                Refresh
              </button>
            </div>
            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Search batches by name or code"
                placeholder="Search batches by name or code..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/60 pl-8.5 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {campuses.length > 1 ? (
              <select
                aria-label="Filter batches by campus"
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs text-zinc-900 transition-all focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:w-64"
              >
                <option value="">All campuses</option>
                {campuses.map((campus) => (
                  <option key={campus.campusId} value={campus.campusId}>
                    {campus.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white py-12 text-xs text-zinc-500 shadow-2xs">
              <Loader2 className="size-4 animate-spin text-zinc-700" /> Loading batches…
            </div>
          ) : batches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center shadow-2xs">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 border border-zinc-200/80">
                <LayoutGrid className="size-6" aria-hidden />
              </div>
              <h3 className="text-base font-bold text-zinc-900">No batches yet</h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs text-zinc-500">
                Create your first batch using the form on the left, then add members from Candidate
                Onboarding or open a batch to manage its roster.
              </p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="rounded-xl border border-zinc-200/80 bg-white py-12 text-center text-xs text-zinc-500 shadow-2xs">
              No batches match your search or campus filter.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredBatches.map((batch) => (
                <li key={batch.batchId}>
                  <Link
                    href={`/batches/${batch.batchId}`}
                    className="group flex h-full flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4.5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs"
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-colors">
                          <Users className="size-4" aria-hidden />
                        </span>
                        <span className="inline-flex items-center rounded-md border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">
                          {batch.code ?? 'No code'}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900 group-hover:text-zinc-700 transition-colors">
                        {batch.name}
                      </h3>
                      {batch.campusName && campuses.length > 1 ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-zinc-500">
                          <MapPin className="size-3" aria-hidden /> {batch.campusName}
                        </p>
                      ) : null}
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Members
                        </dt>
                        <dd className="mt-0.5 text-base font-bold tabular-nums text-zinc-900">
                          {batch.memberCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          Pending invites
                        </dt>
                        <dd className="mt-0.5">
                          {batch.pendingInviteCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs">
                              <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                              {batch.pendingInviteCount}
                            </span>
                          ) : (
                            <span className="text-base font-bold tabular-nums text-zinc-400">
                              0
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
