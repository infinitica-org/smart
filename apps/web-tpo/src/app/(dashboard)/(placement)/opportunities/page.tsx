'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Search } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { ATS_STAGES, type ApplicationDto, type AtsStage } from '@smart/contracts';
import { Alert } from '@smart/ui';
import { applicationsApi, openingsApi } from '@/lib/api';
import { stageBadgeClass, stageLabel } from '@/lib/ats-stage-ui';
import {
  inputClass,
  mutedTextClass,
  primaryButtonSmClass,
  secondaryButtonSmClass,
  selectClass,
  surfaceClass,
  tableCellClass,
  tableHeadCellClass,
  tableRowClass,
} from '@/lib/tpo-ui';
import { PlacementEmptyState } from '@/components/placement/PlacementEmptyState';
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

type OpportunityRow = {
  application: ApplicationDto;
  companyName: string;
  roleTitle: string;
};

const STAGE_FILTERS: readonly (AtsStage | 'ALL')[] = ['ALL', ...ATS_STAGES];

export default function OpportunitiesPage() {
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<AtsStage | 'ALL'>('ALL');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    openingsApi
      .list()
      .then(async (res) => {
        const perOpening = await Promise.all(
          res.openings.map(async (opening) => {
            try {
              const listed = await applicationsApi.listForOpening(opening.openingId);
              return listed.applications.map((application) => ({
                application,
                companyName: opening.companyName,
                roleTitle: opening.roleTitle,
              }));
            } catch {
              return [];
            }
          }),
        );
        if (!cancelled) setRows(perOpening.flat());
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught, 'Could not load candidate applications.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = rows.filter(({ application, companyName, roleTitle }) => {
    if (stageFilter !== 'ALL' && application.stage !== stageFilter) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (application.studentName ?? '').toLowerCase().includes(query) ||
      roleTitle.toLowerCase().includes(query) ||
      companyName.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <PlacementPageHeader
        eyebrow="Placement · Candidate Discovery"
        title="Opportunities"
        description="View placement applications and their current ATS stage across every opening."
      />

      <div className={`${surfaceClass} flex flex-col gap-3 p-4 md:flex-row md:items-center`}>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--ds-text-subtle)]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, role, or company..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <label className="flex items-center gap-2">
          <span className="sr-only">Filter by stage</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as AtsStage | 'ALL')}
            className={`${selectClass} min-w-[180px]`}
          >
            {STAGE_FILTERS.map((stage) => (
              <option key={stage} value={stage}>
                {stage === 'ALL' ? 'All Stages' : stageLabel(stage)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <Alert tone="danger" title="Applications unavailable">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <p role="status" className={`text-sm ${mutedTextClass}`}>
          Loading candidate pipeline…
        </p>
      ) : filtered.length === 0 ? (
        <PlacementEmptyState
          icon={ClipboardList}
          title="No applications yet"
          description="Applications will appear here as candidates enter the placement pipeline."
        />
      ) : (
        <div className={`${surfaceClass} overflow-x-auto`}>
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr>
                <th className={tableHeadCellClass}>Candidate</th>
                <th className={tableHeadCellClass}>Opportunity</th>
                <th className={tableHeadCellClass}>Pipeline Status</th>
                <th className={tableHeadCellClass}>Match Score</th>
                <th className={`${tableHeadCellClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ application, companyName, roleTitle }) => (
                <tr key={application.applicationId} className={tableRowClass}>
                  <td className={tableCellClass}>
                    <p className="font-semibold text-[var(--ds-text)]">
                      {application.studentName ?? 'Candidate'}
                    </p>
                    <p className={`mt-0.5 text-xs ${mutedTextClass}`}>
                      Updated{' '}
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                        new Date(application.updatedAt),
                      )}
                    </p>
                  </td>
                  <td className={tableCellClass}>
                    <p className="font-semibold text-[var(--ds-text)]">{roleTitle}</p>
                    <p className={`mt-0.5 text-xs ${mutedTextClass}`}>{companyName}</p>
                  </td>
                  <td className={tableCellClass}>
                    <span className={stageBadgeClass(application.stage)}>
                      {stageLabel(application.stage)}
                    </span>
                  </td>
                  <td className={tableCellClass}>
                    {application.matchScore !== null ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {Math.round(application.matchScore * 100)}%
                      </span>
                    ) : (
                      <span className={mutedTextClass}>Not scored yet</span>
                    )}
                  </td>
                  <td className={`${tableCellClass} text-right`}>
                    {application.stage === 'SHORTLISTED' || application.stage === 'INTERVIEW' ? (
                      <Link href="/review" className={primaryButtonSmClass}>
                        Review & Send
                      </Link>
                    ) : (
                      <Link
                        href={`/ats?applicationId=${application.applicationId}`}
                        className={secondaryButtonSmClass}
                      >
                        View Details
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
