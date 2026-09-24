'use client';

import { useState } from 'react';
import { useQuery } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import { SettingsCard, StatusMessage } from './account-ui';

export function MessagingPreferenceCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['me', 'messaging'] as const,
    queryFn: () => api.users.getMessagingPreference(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = data?.allowEmployerMessages ?? true;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api.users.updateMessagingPreference({ allowEmployerMessages: !allowed });
      await refetch();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update this setting.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      title="Employer messages"
      description="Choose whether employers can start a conversation with you."
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          {allowed ? 'Employers can message me' : 'Employers cannot message me'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={allowed}
          aria-label="Allow employers to message me"
          disabled={busy || isLoading}
          onClick={() => void toggle()}
          className={`relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50 ${
            allowed ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-950 ${
              allowed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
    </SettingsCard>
  );
}
