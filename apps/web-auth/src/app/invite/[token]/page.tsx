'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@smart/ui';
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { api, redirectForRole, storeSession } from '../../../lib/api';

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof api.auth.previewInvitation>
  > | null>(null);

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isAlreadyActivated, setIsAlreadyActivated] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoadingPreview(true);
    setPreviewError(null);

    api.auth
      .previewInvitation(token)
      .then((res) => {
        setPreview(res);
        if (res.status === 'ACCEPTED') {
          setIsAlreadyActivated(true);
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : '';
        if (
          message.toLowerCase().includes('already been accepted') ||
          message.toLowerCase().includes('already been activated')
        ) {
          setIsAlreadyActivated(true);
        } else {
          setPreviewError(
            'This activation link is invalid, revoked, or has expired. Please request a new invitation from your university administrator.',
          );
        }
      })
      .finally(() => {
        setLoadingPreview(false);
      });
  }, [token]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirm) {
      setSubmitError('Passwords do not match. Please verify your password entry.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.auth.acceptInvitation(token, { password });
      storeSession(result.accessToken);
      setActivationSuccess(true);
      setTimeout(() => {
        redirectForRole(result.user.role, result.accessToken);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (
        message.toLowerCase().includes('already been accepted') ||
        message.toLowerCase().includes('already been activated')
      ) {
        setIsAlreadyActivated(true);
      } else {
        setSubmitError(message || 'Could not activate your account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--ds-background)] text-[var(--ds-text)]">
      <div className="w-full max-w-md space-y-6">
        {/* Branding Logo / Header */}
        <div className="text-center space-y-1.5">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--ds-primary)]/10 text-[var(--ds-primary)]">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SMART Readiness Platform</h1>
          <p className="text-xs text-[var(--ds-text-muted)]">
            Official University Account Activation
          </p>
        </div>

        <Card variant="bordered" className="shadow-lg border-[var(--ds-border)]">
          {/* Loading Preview State */}
          {loadingPreview ? (
            <CardContent className="p-8 text-center space-y-3">
              <Loader2 className="size-6 animate-spin mx-auto text-[var(--ds-primary)]" />
              <p className="text-xs font-medium text-[var(--ds-text-muted)]">
                Verifying your invitation link...
              </p>
            </CardContent>
          ) : isAlreadyActivated ? (
            /* Already Activated State */
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Account Already Activated</CardTitle>
                <CardDescription className="text-xs">
                  This account has already been activated. You can now sign in to your SMART portal.
                </CardDescription>
              </div>
              <div className="pt-2">
                <a
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90 transition-opacity"
                >
                  Sign In to SMART
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </CardContent>
          ) : previewError ? (
            /* Expired or Invalid Link State */
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="size-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-red-700 dark:text-red-400">
                  Invitation Invalid or Expired
                </CardTitle>
                <CardDescription className="text-xs text-[var(--ds-text-muted)]">
                  {previewError}
                </CardDescription>
              </div>
              <div className="pt-2">
                <a
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--ds-border)] bg-transparent px-4 py-2 text-xs font-semibold text-[var(--ds-text)] hover:bg-[var(--ds-surface-hover)] transition-colors"
                >
                  Back to Sign In
                </a>
              </div>
            </CardContent>
          ) : activationSuccess ? (
            /* Activation Success State */
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="size-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
                  Account Activated Successfully!
                </CardTitle>
                <CardDescription className="text-xs">
                  Redirecting you to your SMART workspace...
                </CardDescription>
              </div>
            </CardContent>
          ) : (
            /* Activation Form State */
            <>
              <CardHeader className="border-b border-[var(--ds-border-subtle)] pb-4">
                <CardTitle className="text-base">Activate Your Account</CardTitle>
                <CardDescription className="text-xs">
                  {preview ? (
                    <span className="block mt-1 font-medium text-[var(--ds-text)]">
                      {preview.fullName} ({preview.email}) &bull; {preview.institutionName}
                    </span>
                  ) : null}
                  Set a secure password to complete your SMART account setup.
                </CardDescription>
              </CardHeader>

              <form onSubmit={onSubmit} className="p-6 space-y-4">
                {submitError ? <Alert tone="danger" title={submitError} /> : null}

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold mb-1 text-[var(--ds-text)]"
                    >
                      Create Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        minLength={8}
                        required
                        className="pl-9 text-xs"
                      />
                      <Lock className="size-4 absolute left-3 top-2.5 text-[var(--ds-text-muted)]" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold mb-1 text-[var(--ds-text)]"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Re-enter password"
                        minLength={8}
                        required
                        className="pl-9 text-xs"
                      />
                      <Lock className="size-4 absolute left-3 top-2.5 text-[var(--ds-text-muted)]" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting || !password || !confirm}
                    isLoading={submitting}
                    className="w-full justify-center"
                  >
                    Activate Account & Continue
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
