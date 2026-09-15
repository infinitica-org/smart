'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAccessToken, isSmartApiError } from '@smart/api-client';
import type { AuthenticatedUser } from '@smart/contracts';
import { Alert } from '@smart/ui';
import BlackLogo from '@smart/ui/assets/images/Logos/WebP/BLACK LOGO@4x.webp';
import { validateChangePasswordInput } from '../../lib/change-password-validation';
import { signOut } from '../../lib/auth';
import { api, storeSession } from '../../lib/api';

const inputClassName =
  'w-full rounded-md border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#004c63] focus:outline-none focus:ring-2 focus:ring-[#004c63]/20';

export function ChangePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (!getAccessToken()) {
          const refreshed = await api.auth.refresh();
          storeSession(refreshed.accessToken);
        }
        const me = await api.auth.me();
        if (cancelled) return;
        setUser(me);
        if (me.provider !== 'PASSWORD') {
          setBlockedMessage(
            'This account uses single sign-on (Google or Microsoft). Password change is not available — continue using SSO to sign in.',
          );
        }
      } catch {
        if (!cancelled) {
          router.replace('/login?returnTo=/change-password');
        }
        return;
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const validationError = validateChangePasswordInput({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      await signOut();
      router.replace('/login?passwordChanged=1');
    } catch (err) {
      if (isSmartApiError(err)) {
        setError(err.message);
      } else {
        setError('Could not change password. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <section className="flex w-full max-w-sm flex-col items-center justify-center px-4 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#004c63]/20 border-t-[#004c63]" />
        <p className="mt-3 text-sm text-slate-600">Loading…</p>
      </section>
    );
  }

  return (
    <section className="flex w-full max-w-sm flex-col items-start justify-center px-4 py-8 sm:px-0">
      <div className="mb-4">
        <Image
          src={BlackLogo}
          alt="SMART Logo"
          width={180}
          height={48}
          className="h-9 w-auto object-contain"
          priority
        />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Change password
      </h1>
      {user ? (
        <p className="mt-2 text-sm text-slate-600">
          Signed in as <span className="font-medium text-slate-800">{user.email}</span>
        </p>
      ) : null}

      {blockedMessage ? (
        <div className="mt-4 w-full space-y-4">
          <Alert tone="warning" title={blockedMessage} />
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-[#004c63] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mt-4 w-full">
              <Alert tone="danger" title={error} />
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 w-full space-y-5">
            <PasswordField
              id="current-password"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((v) => !v)}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              autoComplete="new-password"
              hint="At least 8 characters."
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-md bg-[#004c63] py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#003a4d] active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>

          <p className="mt-4 w-full text-center text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-[#004c63] hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

function PasswordField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id} className="block text-xs font-semibold text-slate-800">
        {props.label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          id={props.id}
          type={props.show ? 'text' : 'password'}
          required
          autoComplete={props.autoComplete}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={`${inputClassName} pr-10`}
        />
        <button
          type="button"
          onClick={props.onToggleShow}
          aria-label={props.show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          {props.show ? 'Hide' : 'Show'}
        </button>
      </div>
      {props.hint ? <p className="text-xs text-slate-500">{props.hint}</p> : null}
    </div>
  );
}
