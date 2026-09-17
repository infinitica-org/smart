'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, RefreshCw, Search } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { JOB_OPENING_STATUSES, type JobOpeningDto, type JobOpeningStatus } from '@smart/contracts';
import { openingsApi } from '../lib/api';
import { labelFor, skillNameFor } from '../lib/job-posting';
import {
  chipClass,
  errorNoticeClass,
  inputClass,
  labelClass,
  mutedTextClass,
  primaryButtonClass,
  primaryButtonSmClass,
  secondaryButtonClass,
  secondaryButtonSmClass,
  sectionLabelClass,
  sectionTitleClass,
  subtleTextClass,
  surfaceClass,
  tableCellClass,
  tableHeadCellClass,
  tableRowClass,
} from '../lib/tpo-ui';
import { JobPostingWizard } from './job-posting/JobPostingWizard';
import { PlacementEmptyState } from './placement/PlacementEmptyState';
import { PlacementPageHeader } from './placement/PlacementPageHeader';

const STATUS_PILL_CLASS: Record<JobOpeningStatus, string> = {
  DRAFT: 'border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)]',
  OPEN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CLOSED: 'border-[var(--ds-coral-border)] bg-[#fef4f4] text-[var(--ds-coral)]',
};

const statusPillBaseClass =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

export function OpeningsWorkspace() {
  const [openings, setOpenings] = useState<JobOpeningDto[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'create'>('create');
  const [statusFilter, setStatusFilter] = useState<JobOpeningStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [inspectedOpening, setInspectedOpening] = useState<JobOpeningDto | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  async function loadOpenings(statusToFetch?: JobOpeningStatus | 'ALL') {
    setLoading(true);
    setListError(null);
    const filter = statusToFetch ?? statusFilter;
    try {
      const query = filter !== 'ALL' ? { status: filter } : undefined;
      const res = await openingsApi.list(query);
      setOpenings(res.openings);
    } catch (caught) {
      setListError(errorMessage(caught, 'Could not load job openings.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOpenings();
  }, []);

  async function handleFilterChange(filter: JobOpeningStatus | 'ALL') {
    setStatusFilter(filter);
    await loadOpenings(filter);
  }

  async function handleInspectOpening(openingId: string) {
    setSelectedOpeningId(openingId);
    setInspectLoading(true);
    setInspectError(null);
    try {
      const dto = await openingsApi.get(openingId);
      setInspectedOpening(dto);
    } catch (caught) {
      setInspectError(errorMessage(caught, 'Could not load opening details.'));
      const local = openings.find((opening) => opening.openingId === openingId);
      if (local) setInspectedOpening(local);
    } finally {
      setInspectLoading(false);
    }
  }

  function handleCloseInspection() {
    setSelectedOpeningId(null);
    setInspectedOpening(null);
    setInspectError(null);
  }

  const filteredOpenings = openings.filter((opening) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      opening.roleTitle.toLowerCase().includes(query) ||
      opening.companyName.toLowerCase().includes(query) ||
      (opening.location && opening.location.toLowerCase().includes(query)) ||
      labelFor(opening.domain).toLowerCase().includes(query)
    );
  });

  return (
    <>
      <PlacementPageHeader
        eyebrow="Placement · Job Management"
        title="Job Openings"
        description="Create a structured placement opportunity and track every opening for your institution."
        actions={
          <>
            <button
              type="button"
              aria-pressed={activeTab === 'inbox'}
              className={activeTab === 'inbox' ? primaryButtonClass : secondaryButtonClass}
              onClick={() => setActiveTab('inbox')}
            >
              JD Inbox ({openings.length})
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'create'}
              className={activeTab === 'create' ? primaryButtonClass : secondaryButtonClass}
              onClick={() => setActiveTab('create')}
            >
              Post structured JD
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void loadOpenings()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </>
        }
      />

      {activeTab === 'create' ? <JobPostingWizard onCreated={() => loadOpenings()} /> : null}

      <section aria-labelledby="opening-list-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 id="opening-list-heading" className={sectionTitleClass}>
              Current openings
            </h2>
            <span className={chipClass}>{filteredOpenings.length} total</span>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 sm:w-[190px]">
              <span className={labelClass}>Status</span>
              <select
                aria-label="Filter openings by status"
                className={inputClass}
                value={statusFilter}
                onChange={(e) =>
                  void handleFilterChange(e.target.value as JobOpeningStatus | 'ALL')
                }
              >
                <option value="ALL">All Statuses</option>
                {JOB_OPENING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {labelFor(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 sm:w-[280px]">
              <span className={labelClass}>Search</span>
              <span className="relative block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--ds-text-subtle)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search openings"
                  placeholder="Search role, company, location…"
                  className={`${inputClass} pl-9`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </span>
            </label>
          </div>
        </div>

        {selectedOpeningId ? (
          <div className={`${surfaceClass} border-[var(--tpo-accent-border)] p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ds-border-subtle)] pb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-[var(--ds-text)]">
                    {inspectedOpening?.roleTitle ?? 'Opening details'}
                  </h3>
                  {inspectedOpening ? (
                    <span
                      className={`${statusPillBaseClass} ${STATUS_PILL_CLASS[inspectedOpening.status]}`}
                    >
                      {labelFor(inspectedOpening.status)}
                    </span>
                  ) : null}
                </div>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  {inspectedOpening?.companyName ?? 'Loading details…'}
                </p>
              </div>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={handleCloseInspection}
              >
                Close inspection
              </button>
            </div>
            <div className="pt-5">
              {inspectLoading ? (
                <p role="status" className={`text-sm ${mutedTextClass}`}>
                  Fetching details for opening {selectedOpeningId}…
                </p>
              ) : inspectError ? (
                <div role="alert" className={errorNoticeClass}>
                  <p className="font-semibold">Could not inspect opening</p>
                  <p className="mt-0.5">{inspectError}</p>
                </div>
              ) : inspectedOpening ? (
                <>
                  <dl className="grid gap-4 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-5 sm:grid-cols-2 md:grid-cols-3">
                    <DetailItem label="Domain" value={labelFor(inspectedOpening.domain)} />
                    <DetailItem
                      label="Experience Range"
                      value={`${inspectedOpening.minYearsExperience}–${inspectedOpening.maxYearsExperience} years`}
                    />
                    <DetailItem label="Location" value={inspectedOpening.location} />
                    <DetailItem
                      label="Employment Type"
                      value={labelFor(inspectedOpening.employmentType)}
                    />
                    <DetailItem
                      label="Headcount"
                      value={`${inspectedOpening.headcount} position(s)`}
                    />
                    <DetailItem
                      label="Created Date"
                      value={new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                        new Date(inspectedOpening.createdAt),
                      )}
                    />
                  </dl>
                  <div className="mt-5">
                    <h4 className={`mb-3 ${sectionTitleClass}`}>Required Taxonomy Skills</h4>
                    {inspectedOpening.requiredSkills.length === 0 ? (
                      <p className={`text-sm ${mutedTextClass}`}>No skill constraints.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[var(--ds-border)]">
                        <table className="w-full text-left">
                          <thead className="bg-[var(--ds-surface-muted)]">
                            <tr>
                              <th className={tableHeadCellClass}>Skill Name</th>
                              <th className={tableHeadCellClass}>Skill Code</th>
                              <th className={tableHeadCellClass}>Minimum Proficiency</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectedOpening.requiredSkills.map((req) => (
                              <tr key={req.skillCode} className={tableRowClass}>
                                <td
                                  className={`${tableCellClass} font-semibold text-[var(--ds-text)]`}
                                >
                                  {skillNameFor(req.skillCode)}
                                </td>
                                <td className={`${tableCellClass} font-mono text-xs`}>
                                  {req.skillCode}
                                </td>
                                <td className={tableCellClass}>
                                  <span className={chipClass}>{labelFor(req.minProficiency)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {listError ? (
          <div role="alert" className={errorNoticeClass}>
            <p className="font-semibold">Openings unavailable</p>
            <p className="mt-0.5">{listError}</p>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6">
            <p role="status" className={`text-sm ${mutedTextClass}`}>
              Loading openings…
            </p>
          </div>
        ) : filteredOpenings.length === 0 ? (
          <PlacementEmptyState
            icon={Briefcase}
            title="No job openings yet"
            description="Create your first structured job opening to start the placement workflow."
          />
        ) : (
          <div className={`${surfaceClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left whitespace-nowrap">
                <thead className="bg-[var(--ds-surface-muted)]">
                  <tr>
                    <th className={tableHeadCellClass}>Company / Role</th>
                    <th className={tableHeadCellClass}>Domain</th>
                    <th className={tableHeadCellClass}>Experience</th>
                    <th className={tableHeadCellClass}>Location</th>
                    <th className={tableHeadCellClass}>Type</th>
                    <th className={tableHeadCellClass}>Headcount</th>
                    <th className={tableHeadCellClass}>Status</th>
                    <th className={tableHeadCellClass}>Created</th>
                    <th className={tableHeadCellClass}>
                      <span className="block w-full text-right">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpenings.map((opening) => (
                    <tr
                      key={opening.openingId}
                      className={`${tableRowClass} transition hover:bg-[var(--ds-surface-hover)]`}
                    >
                      <td className={tableCellClass}>
                        <span className="block font-semibold text-[var(--ds-text)]">
                          {opening.roleTitle}
                        </span>
                        <span className={`mt-0.5 block text-xs ${mutedTextClass}`}>
                          {opening.companyName}
                        </span>
                      </td>
                      <td className={tableCellClass}>{labelFor(opening.domain)}</td>
                      <td className={tableCellClass}>
                        {opening.minYearsExperience}–{opening.maxYearsExperience} years
                      </td>
                      <td className={tableCellClass}>{opening.location}</td>
                      <td className={tableCellClass}>{labelFor(opening.employmentType)}</td>
                      <td className={`${tableCellClass} font-semibold text-[var(--ds-text)]`}>
                        {opening.headcount}
                      </td>
                      <td className={tableCellClass}>
                        <span
                          className={`${statusPillBaseClass} ${STATUS_PILL_CLASS[opening.status]}`}
                        >
                          {labelFor(opening.status)}
                        </span>
                      </td>
                      <td className={`${tableCellClass} ${subtleTextClass}`}>
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                          new Date(opening.createdAt),
                        )}
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className={secondaryButtonSmClass}
                            onClick={() => void handleInspectOpening(opening.openingId)}
                          >
                            Inspect JD
                          </button>
                          <Link
                            href={`/suggestions?openingId=${opening.openingId}`}
                            className={primaryButtonSmClass}
                          >
                            Suggestions
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={sectionLabelClass}>{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[var(--ds-text)]">{value}</dd>
    </div>
  );
}
