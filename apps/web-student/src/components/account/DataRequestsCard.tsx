'use client';

import { useState } from 'react';
import { useQuery } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import { CreateDataRequestSchema, type DataRequestType } from '@smart/contracts';
import { api } from '@/lib/api';
import { fieldClass, primaryButtonClass, SettingsCard, StatusMessage } from './account-ui';

const TYPE_LABEL: Record<DataRequestType, string> = {
  CORRECTION: 'Correct my data',
  DELETION: 'Delete my data',
};

export function DataRequestsCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['me', 'data-requests'] as const,
    queryFn: () => api.users.listDataRequests(),
  });
  const [type, setType] = useState<DataRequestType>('CORRECTION');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    setError(null);
    setSubmitted(false);
    const parsed = CreateDataRequestSchema.safeParse({ type, details });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your request.');
      return;
    }
    setBusy(true);
    try {
      await api.users.createDataRequest(parsed.data);
      setDetails('');
      setSubmitted(true);
      await refetch();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not submit your request. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const requests = data?.requests ?? [];

  return (
    <SettingsCard
      title="Your data"
      description="Ask us to correct or delete the personal data we hold about you."
    >
      <div className="grid gap-3">
        <label className="grid gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Request type
          <select
            className={fieldClass}
            value={type}
            onChange={(e) => setType(e.target.value as DataRequestType)}
          >
            {(Object.keys(TYPE_LABEL) as DataRequestType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Details
          <textarea
            className={fieldClass}
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>
      </div>
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
      {submitted && <StatusMessage kind="success">Request submitted.</StatusMessage>}
      <div className="mt-4">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </div>

      <h3 className="mt-6 text-xs font-bold text-zinc-950 dark:text-white">Your requests</h3>
      {isLoading ? (
        <p className="mt-2 text-xs text-zinc-500">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">You have not made any requests.</p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span className="text-zinc-700 dark:text-zinc-300">{TYPE_LABEL[r.type]}</span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {r.status.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
