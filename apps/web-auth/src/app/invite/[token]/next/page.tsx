'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle } from '@smart/ui';
import { getAccessToken } from '@smart/api-client';
import { api, buildPortalRedirectUrl, studentDashboardUrl } from '../../../../lib/api';

export default function InviteNextPage() {
  const [tracks, setTracks] = useState<Array<{ code: string; name: string }>>([]);
  const [trackCode, setTrackCode] = useState('');
  const [tracksLoading, setTracksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.catalog.tracks().then((list) => {
      setTracks(list.map((t) => ({ code: t.code, name: t.name })));
      if (list[0]) setTrackCode(list[0].code);
      setTracksLoading(false);
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface,#fafafa)] px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="mb-2 flex gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-brand-600" />
            <div className="h-1 flex-1 rounded-full bg-brand-600" />
          </div>
          <p className="text-xs text-[var(--text-muted,#666)]">Step 2 of 2</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose your track</CardTitle>
            <CardDescription>Select a primary specialization to continue.</CardDescription>
          </CardHeader>

          <div className="space-y-4 px-6 pb-6">
            {error ? <Alert tone="danger" title={error} /> : null}

            <div role="radiogroup" aria-label="Track" className="space-y-2">
              {tracksLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[52px] animate-pulse rounded-lg bg-black/5" />
                  ))
                : tracks.map((t) => {
                    const selected = t.code === trackCode;
                    return (
                      <button
                        key={t.code}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTrackCode(t.code)}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                          selected
                            ? 'border-brand-600 bg-brand-50 font-medium text-brand-900'
                            : 'border-black/10 text-[var(--text,#111)] hover:border-black/20'
                        }`}
                      >
                        {t.name}
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? 'border-brand-600 bg-brand-600' : 'border-black/20'
                          }`}
                        >
                          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                        </span>
                      </button>
                    );
                  })}
            </div>

            <Button onClick={onContinue} disabled={loading || !trackCode} className="w-full">
              {loading ? 'Saving…' : 'Go to student portal'}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
