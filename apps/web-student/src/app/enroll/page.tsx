'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, Button, Card, CardHeader, CardTitle, CardDescription, Alert } from '@smart/ui';
import { api } from '../../lib/api';
import type { TrackDto } from '@smart/contracts';

export default function EnrollPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const data = await api.catalog.tracks();
        setTracks(data);
      } catch (err: unknown) {
        console.error(err);
        setError('Failed to load available tracks.');
      } finally {
        setLoading(false);
      }
    };
    fetchTracks();
  }, []);

  const handleEnroll = async (trackCode: string) => {
    setEnrolling(trackCode);
    setError(null);
    try {
      await api.auth.enrollTrack({ trackCode });
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to enroll in the track. Please try again.');
      setEnrolling(null);
    }
  };

  return (
    <AppShell
      productName="SMART"
      title="Track Enrollment"
      subtitle="Select a track to begin your certification journey."
    >
      <div className="mx-auto mt-12 max-w-3xl">
        {error && (
          <Alert tone="danger" title="Error" className="mb-6">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tracks.map((track) => (
              <Card key={track.code} className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>{track.name}</CardTitle>
                  <CardDescription>{track.category}</CardDescription>
                </CardHeader>
                <div className="p-6 pt-0 mt-auto flex flex-col gap-4">
                  <div className="text-sm text-[var(--text-muted)] flex justify-between">
                    <span>{track.levels.length} Levels</span>
                    <span>{(track.foundationWeight * 100).toFixed(0)}% Foundation</span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleEnroll(track.code)}
                    disabled={enrolling !== null}
                  >
                    {enrolling === track.code ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
