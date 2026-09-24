'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import { STUDENT_DASHBOARD_QUERY_KEY } from '@/lib/use-student-dashboard';
import { SettingsCard, StatusMessage } from './account-ui';

/** Opt-in for the employer profile-view count. Off by default; the API returns no number until on. */
export function ProfileViewsSettingCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['me', 'profile-views-setting'] as const,
    queryFn: () => api.users.getProfileViewSetting(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = data?.showEmployerViewCount ?? false;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api.users.updateProfileViewSetting({ showEmployerViewCount: !enabled });
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: STUDENT_DASHBOARD_QUERY_KEY }),
      ]);
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update this setting.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      title="Employer profile views"
      description="Show how many employers opened your public profile in the last 30 days. Views by institution staff are not counted."
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          {enabled ? 'Show my employer view count' : 'Hide my employer view count'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Show employer profile-view count"
          disabled={busy || isLoading}
          onClick={() => void toggle()}
          className={`relative h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-950 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
    </SettingsCard>
  );
}
