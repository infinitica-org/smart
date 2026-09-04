'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import { api, redirectForRole, storeSession } from '../../../lib/api';

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof api.auth.previewInvitation>
  > | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.auth
      .previewInvitation(token)
      .then(setPreview)
      .catch(() => setError('Invitation not found or expired.'));
  }, [token]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.acceptInvitation(token, { password });
      storeSession(result.accessToken);
      // Every role lands on its portal home the same way; for a student that's
      // /dashboard, and OnboardingGate there sends them straight into
      // /onboarding (pre-filled from the invite) since onboardingCompleted is
      // still false on a freshly accepted account.
      redirectForRole(result.user.role, result.accessToken);
    } catch {
      setError('Could not accept invitation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8 mt-16">
      <Card>
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>
            {preview
              ? `${preview.fullName} — ${preview.institutionName}${preview.batchName ? ` (${preview.batchName})` : ''}`
              : 'Loading invitation…'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
          {error ? <Alert tone="danger" title={error} /> : null}
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          <Button type="submit" disabled={loading || !preview}>
            {loading ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
