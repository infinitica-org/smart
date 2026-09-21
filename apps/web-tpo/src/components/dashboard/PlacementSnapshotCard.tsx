'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ApplicationDto, JobOpeningDto } from '@smart/contracts';
import { applicationsApi, openingsApi } from '../../lib/api';
import {
  bentoCardClass,
  dashboardMetricValueClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSkeletonClass,
} from '../../lib/tpo-dashboard-ui';

const TERMINAL_STAGES = new Set(['HIRED', 'REJECTED', 'WITHDRAWN']);

function computeSnapshot(openings: JobOpeningDto[], applications: ApplicationDto[]) {
  return {
    activeOpenings: openings.filter((opening) => opening.status === 'OPEN').length,
    inPipeline: applications.filter((application) => !TERMINAL_STAGES.has(application.stage))
      .length,
    placed: applications.filter((application) => application.stage === 'HIRED').length,
  };
}

/**
 * Replaces the old Onboarding Trend card, which only echoed the invite-status
 * split already shown elsewhere and admitted it had no historical data. This
 * surfaces the placement funnel instead — the number TPOs actually care about.
 */
export function PlacementSnapshotCard() {
  const [snapshot, setSnapshot] = useState<{
    activeOpenings: number;
    inPipeline: number;
    placed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    openingsApi
      .list()
      .then(async (res) => {
        const lists = await Promise.all(
          res.openings.map((opening) =>
            applicationsApi.listForOpening(opening.openingId).catch(() => ({ applications: [] })),
          ),
        );
        if (!active) return;
        setSnapshot(
          computeSnapshot(
            res.openings,
            lists.flatMap((list) => list.applications),
          ),
        );
      })
      .catch(() => {
        if (active) setSnapshot({ activeOpenings: 0, inPipeline: 0, placed: 0 });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={`${bentoCardClass} lg:col-span-8`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={dashboardSectionTitleClass}>Placement Snapshot</h2>
          <p className={dashboardSectionSubtitleClass}>Live funnel across every job opening</p>
        </div>
        <Link
          href="/reports"
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[var(--ds-text-secondary)] transition-colors hover:text-[var(--ds-text)]"
        >
          Reports <ArrowRight className="size-3.5" strokeWidth={1.5} />
        </Link>
      </div>

      {loading ? (
        <div className={`${dashboardSkeletonClass} mt-6 h-32 w-full rounded-2xl`} />
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={dashboardMetricValueClass}>{snapshot?.activeOpenings ?? 0}</p>
            <p className="mt-1 text-[11px] font-medium text-[var(--ds-text-muted)]">
              Active openings
            </p>
          </div>
          <div className="border-x border-[var(--ds-border-subtle)]">
            <p className={dashboardMetricValueClass}>{snapshot?.inPipeline ?? 0}</p>
            <p className="mt-1 text-[11px] font-medium text-[var(--ds-text-muted)]">In pipeline</p>
          </div>
          <div>
            <p className={dashboardMetricValueClass}>{snapshot?.placed ?? 0}</p>
            <p className="mt-1 text-[11px] font-medium text-[var(--ds-text-muted)]">Placed</p>
          </div>
        </div>
      )}
    </section>
  );
}
