'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { BatchDto } from '@smart/contracts';
import { LayoutGrid, Loader2, Plus, Search, Users } from 'lucide-react';
import { TpoBentoPageHeader } from '../tpo-bento/TpoBentoPageHeader';
import { api } from '../../lib/api';
import {
  bentoChipClass,
  bentoCompactCardClass,
  bentoCompactToolbarClass,
  candidatesControlClass,
  candidatesPageStackClass,
  dashboardErrorNoticeClass,
  dashboardMetricHintClass,
  dashboardPendingBadgeClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
} from '../../lib/tpo-dashboard-ui';
import { labelClass, secondaryButtonClass } from '../../lib/tpo-ui';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredBatches = useMemo(
    () => batches.filter((batch) => matchesBatchQuery(batch, searchQuery)),
    [batches, searchQuery],
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
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.onboarding.createBatch({ name: name.trim(), code: code.trim() || undefined });
      setName('');
      setCode('');
      await load();
      setError(null);
    } catch {
      setError('Could not create batch.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={candidatesPageStackClass}>
      <TpoBentoPageHeader
        compact
        title="Batches"
        description="Group candidates into cohorts for faster filtering — graduating classes (e.g. 2025–2026), sections, or skill-focused lists you manage as a TPO."
        icon={LayoutGrid}
        accent="blue"
        badge={<span className={bentoChipClass}>{batches.length} batches</span>}
      />

      <p className={`${dashboardMetricHintClass} px-0.5 text-[13px] leading-relaxed`}>
        A batch is a named group of students in your institution — not a placement opening. Use
        batches to organize onboarding and to open the same roster when reviewing readiness.
      </p>

      {error ? (
        <div className={dashboardErrorNoticeClass} role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] xl:gap-5">
        <aside className={bentoCompactCardClass}>
          <h2 className={dashboardSectionTitleClass}>Create batch</h2>
          <p className={`${dashboardMetricHintClass} mt-1 text-[12px]`}>
            Example: Batch 2025–2026 or CSE — Advanced Python cohort.
          </p>

          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <div>
              <label className={`${labelClass} mb-1.5 block`} htmlFor="batch-name">
                Batch name
              </label>
              <input
                id="batch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Batch 2025–2026"
                className={candidatesControlClass}
                required
              />
            </div>
            <div>
              <label className={`${labelClass} mb-1.5 block`} htmlFor="batch-code">
                Short code{' '}
                <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
              </label>
              <input
                id="batch-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 25-26"
                className={candidatesControlClass}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className={`${dashboardPrimaryButtonClass} w-full`}
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

        <section className="min-w-0 space-y-3">
          <div className={bentoCompactToolbarClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className={dashboardSectionTitleClass}>Your batches</h2>
              <button type="button" onClick={() => void load()} className={secondaryButtonClass}>
                Refresh
              </button>
            </div>
            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-subtle)]"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Search batches by name or code"
                placeholder="Search batches by name or code..."
                className={`${candidatesControlClass} pl-9`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div
              className={`${bentoCompactCardClass} flex items-center justify-center gap-2 py-10 text-[var(--ds-text-muted)]`}
            >
              <Loader2 className="size-5 animate-spin" /> Loading batches…
            </div>
          ) : batches.length === 0 ? (
            <div className={`${bentoCompactCardClass} px-4 py-8 text-center`}>
              <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]">
                <LayoutGrid className="size-6" aria-hidden />
              </span>
              <h3 className="text-base font-semibold text-[var(--ds-text)]">No batches yet</h3>
              <p className={`${dashboardMetricHintClass} mx-auto mt-1.5 max-w-md text-[13px]`}>
                Create your first batch using the form on the left, then add members from Candidate
                Onboarding or open a batch to manage its roster.
              </p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div
              className={`${bentoCompactCardClass} py-8 text-center text-[13px] text-[var(--ds-text-muted)]`}
            >
              No batches match &quot;{searchQuery.trim()}&quot;.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredBatches.map((batch) => (
                <li key={batch.batchId}>
                  <Link
                    href={`/batches/${batch.batchId}`}
                    className={`${bentoCompactCardClass} group flex h-full flex-col !p-4 transition-colors hover:border-[#dfe4ec]`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tpo-dash-accent-blue-soft)] text-[var(--tpo-dash-accent-blue)]">
                        <Users className="size-[18px]" aria-hidden />
                      </span>
                      <span className={bentoChipClass}>{batch.code ?? 'No code'}</span>
                    </div>
                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--ds-text)] group-hover:text-[var(--tpo-dash-primary)]">
                      {batch.name}
                    </h3>
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--ds-border-subtle)] pt-3">
                      <div>
                        <dt className="text-[11px] font-medium text-[var(--ds-text-muted)]">
                          Members
                        </dt>
                        <dd className="text-base font-semibold tabular-nums text-[var(--ds-text)]">
                          {batch.memberCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-medium text-[var(--ds-text-muted)]">
                          Pending invites
                        </dt>
                        <dd className="mt-0.5">
                          {batch.pendingInviteCount > 0 ? (
                            <span className={dashboardPendingBadgeClass}>
                              {batch.pendingInviteCount}
                            </span>
                          ) : (
                            <span className="text-base font-semibold tabular-nums text-[var(--ds-text-muted)]">
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
