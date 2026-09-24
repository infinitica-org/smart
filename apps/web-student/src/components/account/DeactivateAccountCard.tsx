'use client';

import { useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { fieldClass, SettingsCard, StatusMessage } from './account-ui';

export function DeactivateAccountCard() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    setBusy(true);
    setError(null);
    try {
      await api.users.deactivateAccount({ confirmation: 'DEACTIVATE' });
      await signOut();
    } catch (err) {
      setError(
        isSmartApiError(err) ? err.message : 'Could not deactivate your account. Try again.',
      );
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      tone="danger"
      title="Deactivate account"
      description="Your profile is hidden, employers can no longer message you, and you are signed out. Contact support to reactivate."
    >
      {!open ? (
        <button
          type="button"
          className="rounded-md border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
          onClick={() => setOpen(true)}
        >
          Deactivate my account
        </button>
      ) : (
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Type DEACTIVATE to confirm
            <input
              className={fieldClass}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || confirmation !== 'DEACTIVATE'}
              className="rounded-md bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void deactivate()}
            >
              {busy ? 'Deactivating…' : 'Confirm deactivation'}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-md px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              onClick={() => {
                setOpen(false);
                setConfirmation('');
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
    </SettingsCard>
  );
}
