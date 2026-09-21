'use client';

import { useEffect, useMemo, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { PlacementEmployerSummary } from '@smart/contracts';
import { PLACEMENT_CITY_OPTIONS } from '@smart/contracts';
import { employersApi } from '../../lib/api';
import { candidatesControlClass } from '../../lib/tpo-dashboard-ui';
import {
  inputClass,
  labelClass,
  mutedTextClass,
  primaryButtonSmClass,
  secondaryButtonSmClass,
} from '../../lib/tpo-ui';

export function CompanyEmployerSelect({
  employerId,
  companyName,
  onSelect,
  onClear,
  onCompanyNameDraft,
}: {
  employerId: string;
  companyName: string;
  onSelect: (employer: PlacementEmployerSummary) => void;
  onClear: () => void;
  /** Legacy/free-text company name when no repository employer is selected. */
  onCompanyNameDraft: (name: string) => void;
}) {
  const [employers, setEmployers] = useState<PlacementEmployerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(companyName);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    employersApi
      .list()
      .then((res) => {
        if (!cancelled) setEmployers(res.employers);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(isSmartApiError(caught) ? caught.message : 'Could not load companies.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = employers.find((e) => e.employerId === employerId);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employers.slice(0, 8);
    return employers.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [employers, query]);

  const showNoResults = !loading && query.trim().length >= 2 && matches.length === 0;

  async function handleCreate() {
    const name = newName.trim() || query.trim();
    if (name.length < 2) return;
    setCreating(true);
    setError(null);
    try {
      const created = await employersApi.create({
        name,
        location: newLocation || undefined,
      });
      setEmployers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onSelect(created);
      setShowCreate(false);
      setQuery(created.name);
    } catch (caught: unknown) {
      setError(isSmartApiError(caught) ? caught.message : 'Could not create company.');
    } finally {
      setCreating(false);
    }
  }

  if (selected) {
    return (
      <div className="rounded-[12px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[var(--ds-text)]">{selected.name}</p>
            <p className={`mt-0.5 text-[12px] ${mutedTextClass}`}>
              {[selected.sector, selected.location].filter(Boolean).join(' · ') ||
                'Company profile'}
            </p>
          </div>
          <button type="button" className={secondaryButtonSmClass} onClick={onClear}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <label className={labelClass} htmlFor="job-company-search">
        Company
      </label>
      <input
        id="job-company-search"
        className={candidatesControlClass}
        placeholder="Search or select company…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onCompanyNameDraft(e.target.value);
        }}
        autoComplete="off"
      />
      {loading ? <p className={`text-xs ${mutedTextClass}`}>Loading companies…</p> : null}
      {error ? <p className="text-xs text-[var(--ds-coral)]">{error}</p> : null}
      {matches.length > 0 && !selected ? (
        <ul className="max-h-48 overflow-y-auto rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface)]">
          {matches.map((employer) => (
            <li key={employer.employerId}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-[var(--ds-surface-hover)]"
                onClick={() => {
                  onSelect(employer);
                  setQuery(employer.name);
                }}
              >
                <span className="font-medium text-[var(--ds-text)]">{employer.name}</span>
                {employer.location ? (
                  <span className={`text-[11px] ${mutedTextClass}`}>{employer.location}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showNoResults ? (
        <div className="rounded-[10px] border border-dashed border-[var(--ds-border)] p-3">
          <p className={`text-xs ${mutedTextClass}`}>No company found.</p>
          <button
            type="button"
            className={`mt-2 ${primaryButtonSmClass}`}
            onClick={() => {
              setNewName(query.trim());
              setShowCreate(true);
            }}
          >
            + Add &quot;{query.trim()}&quot; as a new company
          </button>
        </div>
      ) : null}
      {showCreate ? (
        <div className="grid gap-2 rounded-[10px] border border-[var(--ds-border)] p-3">
          <input
            className={inputClass}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Company name"
            aria-label="New company name"
          />
          <select
            className={inputClass}
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            aria-label="Company location"
          >
            <option value="">Location (optional)</option>
            {PLACEMENT_CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              className={primaryButtonSmClass}
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? 'Saving…' : 'Save company'}
            </button>
            <button
              type="button"
              className={secondaryButtonSmClass}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
