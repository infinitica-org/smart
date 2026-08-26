'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle } from '@smart/ui';
import { getAccessToken } from '@smart/api-client';
import { api, buildPortalRedirectUrl, studentDashboardUrl } from '../../../../lib/api';

export default function InviteNextPage() {
  const [tracks, setTracks] = useState<Array<{ code: string; name: string }>>([]);
  const [trackCode, setTrackCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.catalog.tracks().then((list) => {
      setTracks(list.map((t) => ({ code: t.code, name: t.name })));
      if (list[0]) setTrackCode(list[0].code);
    });
  }, []);

  async function onContinue() {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) {
        setError('Session expired. Sign in again.');
        return;
      }
      await api.auth.enrollTrack({ trackCode, slot: 'PRIMARY' });
      window.location.href = buildPortalRedirectUrl(studentDashboardUrl, token);
    } catch {
      setError('Could not enroll track.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8 mt-16">
      <Card>
        <CardHeader>
          <CardTitle>Choose your track</CardTitle>
          <CardDescription>Select a primary specialization to continue.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 space-y-4">
          {error ? <Alert tone="danger" title={error} /> : null}
          <label className="block text-sm">
            Track
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-[var(--surface)]"
              value={trackCode}
              onChange={(e) => setTrackCode(e.target.value)}
            >
              {tracks.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={onContinue} disabled={loading || !trackCode}>
            {loading ? 'Saving…' : 'Go to student portal'}
          </Button>
        </div>
      </Card>
    </main>
  );
}
