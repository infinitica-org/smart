'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Layers, Plus, RotateCcw, Star } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { CampusDto, UpdateCampusRequest } from '@smart/contracts';
import { api } from '../../lib/api';
import {
  bentoCardClass,
  bentoCardMutedClass,
  bentoChipClass,
  dashboardErrorNoticeClass,
  dashboardMintBadgeClass,
  dashboardPrimaryButtonClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
} from '../../lib/tpo-dashboard-ui';
import { inputClass, labelClass, secondaryButtonClass } from '../../lib/tpo-ui';

/** S6-VV-112 (#163) — the institution's campuses. Batches (and so students) belong to one. */
export function CampusesSection({
  institutionName,
  onCountChange,
}: {
  institutionName: string | null;
  onCountChange?: (activeCount: number) => void;
}) {
  const [campuses, setCampuses] = useState<CampusDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await api.onboarding.listCampuses({ includeArchived: true });
      setCampuses(rows);
      onCountChange?.(rows.filter((campus) => !campus.archivedAt).length);
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load campuses.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not update campuses.');
    } finally {
      setBusy(false);
    }
  }

  function update(campusId: string, body: UpdateCampusRequest) {
    void run(() => api.onboarding.updateCampus(campusId, body));
  }

  function onCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    void run(async () => {
      await api.onboarding.createCampus({ name: trimmed, city: city.trim() || undefined });
      setName('');
      setCity('');
    });
  }

  return (
    <section id="settings-campuses" className={bentoCardClass}>
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-zinc-700" />
        <h2 className={dashboardSectionTitleClass}>Campuses</h2>
      </div>
      <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>
        Campuses of{' '}
        <strong className="text-zinc-900">{institutionName ?? 'your institution'}</strong>. Every
        batch belongs to one campus, and new batches go to the primary campus unless you pick
        another. Archived campuses keep their batches but can&apos;t take new ones.
      </p>

      {error ? (
        <p className={`mt-3 ${dashboardErrorNoticeClass}`} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-xs text-zinc-400">Loading campuses…</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {campuses.map((campus) => (
            <li
              key={campus.campusId}
              className={`${bentoCardMutedClass} flex items-center justify-between gap-3 !p-4 ${
                campus.archivedAt ? 'opacity-60' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-zinc-900">
                  {campus.name}
                  {campus.isPrimary ? (
                    <span className={dashboardMintBadgeClass}>Primary</span>
                  ) : null}
                  {campus.archivedAt ? <span className={bentoChipClass}>Archived</span> : null}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {campus.city ? `${campus.city} · ` : ''}
                  {campus.batchCount} {campus.batchCount === 1 ? 'batch' : 'batches'}
                </div>
              </div>
              {campus.isPrimary ? null : (
                <div className="flex shrink-0 gap-1.5">
                  {campus.archivedAt ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => update(campus.campusId, { archived: false })}
                      className={`${secondaryButtonClass} !px-2.5 !py-1.5 text-xs`}
                    >
                      <RotateCcw className="size-3" aria-hidden /> Restore
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => update(campus.campusId, { isPrimary: true })}
                        className={`${secondaryButtonClass} !px-2.5 !py-1.5 text-xs`}
                      >
                        <Star className="size-3" aria-hidden /> Make primary
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Archive ${campus.name}`}
                        onClick={() => update(campus.campusId, { archived: true })}
                        className={`${secondaryButtonClass} !px-2.5 !py-1.5 text-xs`}
                      >
                        <Archive className="size-3" aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={onCreate}
        className="mt-5 flex flex-col gap-2 border-t border-zinc-200/80 pt-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className={labelClass} htmlFor="campus-name">
            Campus name
          </label>
          <input
            id="campus-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. North Campus"
            className={`${inputClass} mt-1.5`}
          />
        </div>
        <div className="sm:w-48">
          <label className={labelClass} htmlFor="campus-city">
            City <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="campus-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Pune"
            className={`${inputClass} mt-1.5`}
          />
        </div>
        <button
          type="submit"
          disabled={busy || name.trim().length < 2}
          className={dashboardPrimaryButtonClass}
        >
          <Plus className="size-4" aria-hidden />
          Add campus
        </button>
      </form>
    </section>
  );
}
