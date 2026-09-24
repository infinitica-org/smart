'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import { UpdatePersonalInfoRequestSchema } from '@smart/contracts';
import { api } from '@/lib/api';
import { fieldClass, primaryButtonClass, SettingsCard, StatusMessage } from './account-ui';

export function PersonalInfoCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['me', 'personal'] as const,
    queryFn: () => api.users.getPersonalInfo(),
  });
  const [fullName, setFullName] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFullName(data.fullName);
    setGraduationYear(data.graduationYear?.toString() ?? '');
  }, [data]);

  async function save() {
    setError(null);
    setSaved(false);
    const parsed = UpdatePersonalInfoRequestSchema.safeParse({
      fullName,
      graduationYear: graduationYear.trim() === '' ? null : Number(graduationYear),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      await api.users.updatePersonalInfo(parsed.data);
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['me'] })]);
      setSaved(true);
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not save your details. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Personal information"
      description="Your name and graduation year, as shown on your profile."
    >
      {isLoading ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : isError ? (
        <StatusMessage kind="error">Could not load your details.</StatusMessage>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Full name
            <input
              className={fieldClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Graduation year
            <input
              className={fieldClass}
              inputMode="numeric"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-zinc-700 sm:col-span-2 dark:text-zinc-300">
            Email
            <input className={fieldClass} value={data?.email ?? ''} disabled readOnly />
          </label>
        </div>
      )}
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
      {saved && <StatusMessage kind="success">Saved.</StatusMessage>}
      <div className="mt-4">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={saving || isLoading}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </SettingsCard>
  );
}
