'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { JobOpeningDto, PlacementEmployerSummary } from '@smart/contracts';
import { PLACEMENT_CITY_OPTIONS } from '@smart/contracts';
import { employersApi, openingsApi } from '../lib/api';
import { tpoApiErrorMessage } from '../lib/api-errors';
import { aggregateCampusCompanies, type CampusCompanyRow } from '../lib/company-repository';
import { bentoPageStackClass, dashboardErrorNoticeClass } from '../lib/tpo-dashboard-ui';
import {
  cardClass,
  inputClass,
  labelClass,
  mutedTextClass,
  primaryButtonClass,
  primaryButtonSmClass,
  secondaryButtonClass,
  secondaryButtonSmClass,
  sectionTitleClass,
  surfaceClass,
} from '../lib/tpo-ui';
import { JobPostingCompanyLogoField } from './job-posting/JobPostingCompanyLogo';
import type { JobPostingCompanyLogo } from '../lib/job-posting';
import { PlacementPageHeader } from './placement/PlacementPageHeader';

function EmployerCard({ employer }: { employer: PlacementEmployerSummary }) {
  return (
    <li className={`${surfaceClass} flex flex-col gap-3 p-4`}>
      <div className="flex items-start gap-3">
        {employer.companyLogoUrl ? (
          <img
            src={employer.companyLogoUrl}
            alt=""
            className="size-12 shrink-0 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] object-contain p-1"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] text-sm font-semibold text-[var(--ds-text-muted)]"
          >
            {employer.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[var(--ds-text)]">{employer.name}</p>
          <p className={`mt-0.5 text-sm ${mutedTextClass}`}>
            {employer.openingCount} posting{employer.openingCount === 1 ? '' : 's'}
            {employer.activeOpeningCount > 0 ? ` · ${employer.activeOpeningCount} live` : ''}
          </p>
          {[employer.sector, employer.location].filter(Boolean).length > 0 ? (
            <p className={`mt-1 text-xs ${mutedTextClass}`}>
              {[employer.sector, employer.location].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
      <Link
        href={`/companies/${employer.employerId}`}
        className={`${secondaryButtonSmClass} w-full text-center`}
      >
        View company
      </Link>
    </li>
  );
}

function LegacyCompanyCard({ row }: { row: CampusCompanyRow }) {
  return (
    <li className={`${surfaceClass} flex flex-col gap-2 border-dashed p-4`}>
      <p className="truncate text-base font-semibold text-[var(--ds-text)]">{row.companyName}</p>
      <p className={`text-sm ${mutedTextClass}`}>
        {row.openingCount} legacy posting{row.openingCount === 1 ? '' : 's'} (no company profile
        yet)
      </p>
      <p className={`text-xs ${mutedTextClass}`}>
        Link future postings via Create Job Posting → select or add this company.
      </p>
    </li>
  );
}

function AddCompanyPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (employer: PlacementEmployerSummary) => void;
}) {
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [aboutCompany, setAboutCompany] = useState('');
  const [companyLogo, setCompanyLogo] = useState<JobPostingCompanyLogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Company name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await employersApi.create({
        name: trimmed,
        sector: sector.trim() || undefined,
        location: location || undefined,
        aboutCompany: aboutCompany.trim() || undefined,
        logoStorageKey: companyLogo?.storageKey,
      });
      onCreated(created);
      onClose();
    } catch (caught) {
      setError(tpoApiErrorMessage(caught, 'Could not create company.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${cardClass} grid gap-4`} role="dialog" aria-labelledby="add-company-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="add-company-title" className={sectionTitleClass}>
          Add company
        </h2>
        <button type="button" className={secondaryButtonSmClass} onClick={onClose}>
          Close
        </button>
      </div>
      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="add-company-name">
            Company name
          </label>
          <input
            id="add-company-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="add-company-sector">
            Industry / category
          </label>
          <input
            id="add-company-sector"
            className={inputClass}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="add-company-location">
            Location
          </label>
          <select
            id="add-company-location"
            className={inputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Select city (optional)</option>
            {PLACEMENT_CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        <JobPostingCompanyLogoField logo={companyLogo} onChange={setCompanyLogo} />
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="add-company-about">
            About the company
          </label>
          <textarea
            id="add-company-about"
            className={`${inputClass} min-h-[88px]`}
            value={aboutCompany}
            onChange={(e) => setAboutCompany(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : 'Save company'}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CompanyRepositoryWorkspace() {
  const [employers, setEmployers] = useState<PlacementEmployerSummary[] | null>(null);
  const [openings, setOpenings] = useState<JobOpeningDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [employerRes, listed] = await Promise.all([employersApi.list(), openingsApi.list()]);
      setEmployers(employerRes.employers);
      setOpenings(listed.openings);
    } catch (caught) {
      setEmployers(null);
      setOpenings(null);
      setError(tpoApiErrorMessage(caught, 'Could not load company records.'));
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredEmployers = useMemo(() => {
    if (!employers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return employers;
    return employers.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.sector?.toLowerCase().includes(q) ?? false) ||
        (e.location?.toLowerCase().includes(q) ?? false),
    );
  }, [employers, search]);

  const legacyRows = useMemo(() => {
    if (!openings || !employers) return [];
    const linkedNames = new Set(employers.map((e) => e.name.trim().toLowerCase()));
    const legacyOpenings = openings.filter((o) => !o.employerId);
    return aggregateCampusCompanies(legacyOpenings).filter(
      (row) => !linkedNames.has(row.companyName.trim().toLowerCase()),
    );
  }, [openings, employers]);

  const showEmpty =
    !loading && filteredEmployers.length === 0 && legacyRows.length === 0 && !search.trim();

  return (
    <div className={bentoPageStackClass}>
      <PlacementPageHeader
        eyebrow="Placement"
        title="Company repository"
        description="Manage employer profiles, placement history, and job openings. Companies are the source of truth for Create Job Posting."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} onClick={() => setShowAdd(true)}>
              + Add company
            </button>
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

      {showAdd ? (
        <AddCompanyPanel
          onClose={() => setShowAdd(false)}
          onCreated={(created) => {
            setEmployers((prev) =>
              prev ? [...prev, created].sort((a, b) => a.name.localeCompare(b.name)) : [created],
            );
          }}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className={`${inputClass} max-w-md flex-1`}
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search companies"
        />
      </div>

      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}

      {loading ? (
        <p aria-live="polite" className={`text-sm ${mutedTextClass}`}>
          Loading company repository…
        </p>
      ) : showEmpty ? (
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>No companies yet</h2>
          <p className={`mt-2 text-sm ${mutedTextClass}`}>
            Add a company profile, then link job postings to it from Create Job Posting.
          </p>
          <p className="mt-4">
            <button type="button" className={primaryButtonSmClass} onClick={() => setShowAdd(true)}>
              Add your first company
            </button>
          </p>
        </div>
      ) : (
        <>
          {filteredEmployers.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEmployers.map((employer) => (
                <EmployerCard key={employer.employerId} employer={employer} />
              ))}
            </ul>
          ) : search.trim() ? (
            <p className={`text-sm ${mutedTextClass}`}>No companies match your search.</p>
          ) : null}
          {legacyRows.length > 0 ? (
            <section className="grid gap-3">
              <h2 className={sectionTitleClass}>Postings without a company profile</h2>
              <p className={`text-sm ${mutedTextClass}`}>
                These names come from older job postings. Create or select a matching company
                profile when posting new roles.
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {legacyRows.map((row) => (
                  <LegacyCompanyCard key={row.companyName} row={row} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
