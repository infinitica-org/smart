'use client';

import { useState } from 'react';
import { api } from '../lib/api';

/**
 * "Send a new verification link" for a student who can't sign in yet. The API answers 204 for
 * any address, so the confirmation never says whether an account exists.
 */
export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onResend() {
    setState('sending');
    try {
      await api.auth.resendEmailVerification({ email: email.trim() });
      setState('sent');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p role="status" className="mt-3 text-left text-sm text-[#166534]">
        If {email.trim()} still needs verifying, a new link is on its way. It can take a minute to
        arrive; check your spam folder too.
      </p>
    );
  }

  return (
    <div className="mt-3 text-left">
      <button
        type="button"
        onClick={() => void onResend()}
        disabled={state === 'sending' || !email.trim()}
        className="text-sm font-semibold text-[#111827] underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
      >
        {state === 'sending' ? 'Sending…' : 'Send a new verification link'}
      </button>
      {state === 'error' ? (
        <p className="mt-1 text-sm text-rose-700">
          Couldn&apos;t send it right now. Try again in a minute.
        </p>
      ) : null}
    </div>
  );
}
