'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AtSign, CheckCircle2 } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import { ErrorBanner, PrimaryButton, StepHeading, TextInput } from '../wizard-ui';

interface UsernameStepProps {
  onContinue: () => void;
}

/**
 * CN-T09 — claims a username during onboarding, since a candidate is far more
 * likely to grab the handle they actually want before someone else takes it.
 * Reserving here is not the same as going public: this only claims the name —
 * the profile stays private until the candidate turns visibility on later,
 * from Public Profile Preview.
 */
export default function UsernameStep({ onContinue }: UsernameStepProps) {
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reserve = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.users.reserveUsername({ username: trimmed });
      setSaved(true);
    } catch (err) {
      if (isSmartApiError(err)) {
        if (err.code === 'rate_limit_exceeded') {
          const wait = err.retryAfterSeconds ? `${String(err.retryAfterSeconds)}s` : 'a bit';
          setError(`Too many attempts — try again in ${wait}.`);
        } else {
          setError(err.message);
        }
      } else {
        setError('Could not reserve that username.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <StepHeading
        title="Claim your handle"
        subtitle="Grab a username for your public profile link before someone else does. It's a one-time choice — pick carefully — and claiming it doesn't make your profile public, that's a separate step."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <div className="mb-8 max-w-sm">
        <div className="relative">
          <AtSign className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <TextInput
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setSaved(false);
              setError(null);
            }}
            placeholder="your-handle"
            className="pl-10"
            disabled={saved}
          />
        </div>
        {saved ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Reserved — it&apos;s yours.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onContinue}
          disabled={saving}
          className="font-axiforma text-sm text-zinc-400 transition-colors hover:text-emerald-400 disabled:opacity-40"
        >
          {saved ? 'Skip' : "I'll do this later"}
        </button>
        {saved ? (
          <PrimaryButton onClick={onContinue}>Go to dashboard</PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => void reserve()} loading={saving}>
            Claim it
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
