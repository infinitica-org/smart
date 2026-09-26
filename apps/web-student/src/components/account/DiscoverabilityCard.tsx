'use client';

import { useState } from 'react';
import { useQuery } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import { SettingsCard, StatusMessage } from './account-ui';

/** S6-VV-113 (#552) — opt out of employer discovery without leaving the platform. */
export function DiscoverabilityCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['me', 'discoverability'] as const,
    queryFn: () => api.users.getDiscoverability(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discoverable = data?.discoverableToEmployers ?? true;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api.users.updateDiscoverability({ discoverableToEmployers: !discoverable });
      await refetch();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update this setting.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      title="Employer discovery"
      description="Choose whether employers can find you in candidate search and job matches. Your placement cell always sees you, and jobs you apply to still see your application."
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          {discoverable ? 'Employers can find me' : 'Hidden from employer search and matches'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={discoverable}
          aria-label="Let employers find me"
          disabled={busy || isLoading}
          onClick={() => void toggle()}
          className={`relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50 ${
            discoverable ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-950 ${
              discoverable ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
    </SettingsCard>
  );
}
