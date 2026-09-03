'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, Button, Card, CardHeader, CardTitle, CardDescription, Alert } from '@smart/ui';
import { api } from '../../lib/api';
import { destinationAfterEnrollment } from '../../lib/candidate-routing';
import type { TrackDto } from '@smart/contracts';

export default function EnrollPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<TrackDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

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

  const handleEnroll = async () => {
    if (!selectedTrack) return;

    setEnrolling(true);
    setError(null);
    try {
      const user = await api.auth.enrollTrack({ trackCode: selectedTrack });
      router.push(destinationAfterEnrollment(user));
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to enroll in the track. Please try again.');
      setEnrolling(false);
    }
  };

  return (
    <AppShell
      productName="SMART"
      title="Track Enrollment"
      subtitle="Select a track to begin your certification journey."
    >
      <div className="mx-auto mt-8 max-w-3xl">
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
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Choose your learning track
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Select one track to focus on for this session.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tracks.map((track) => {
                const isSelected = selectedTrack === track.code;

                return (
                  <Card
                    key={track.code}
                    className={`
                      relative flex flex-col h-full cursor-pointer transition-all overflow-hidden
                      ${
                        isSelected
                          ? 'border-[var(--brand)] ring-1 ring-[var(--brand)] shadow-md bg-[var(--brand)]/5'
                          : 'hover:border-[var(--brand)]/50 hover:bg-[var(--surface-muted)]'
                      }
                    `}
                    onClick={() => setSelectedTrack(track.code)}
                  >
                    {/* Background accent for selected state */}
                    {isSelected && (
                      <div
                        className="absolute top-0 left-0 w-full h-1"
                        style={{ backgroundColor: 'var(--brand)' }}
                      ></div>
                    )}

                    <CardHeader className="pb-3 border-b border-transparent">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <CardTitle className="text-lg">{track.name}</CardTitle>
                          <CardDescription className="mt-1 font-medium text-brand-600 dark:text-brand-400">
                            {track.category}
                          </CardDescription>
                        </div>

                        {/* Radio selection indicator */}
                        <div
                          className={`
                          flex h-5 w-5 shrink-0 items-center justify-center rounded-full border mt-1
                          ${isSelected ? 'border-[var(--brand)]' : 'border-[var(--text-muted)] opacity-50'}
                        `}
                        >
                          {isSelected && (
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: 'var(--brand)' }}
                            />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <div className="p-6 pt-3 mt-auto flex flex-col gap-4">
                      {/* Optional description if available on track type, else fallback */}
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        {'Master the essential skills and competencies required for this role.'}
                      </p>

                      <div className="text-xs text-[var(--text-muted)] flex justify-between items-center bg-[var(--bg-surface)] p-3 rounded border">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {track.levels.length}
                          </span>
                          <span>Levels</span>
                        </div>
                        <div className="h-6 w-px bg-[var(--surface-border)]"></div>
                        <div className="flex flex-col text-right">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {(track.foundationWeight * 100).toFixed(0)}%
                          </span>
                          <span>Foundation Weight</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end pt-6 mt-4 border-t border-[var(--surface-border)] sticky bottom-6 bg-[var(--bg-app)] py-4 z-10">
              <Button
                variant="primary"
                onClick={handleEnroll}
                disabled={!selectedTrack || enrolling}
                className="w-full sm:w-auto min-w-[200px]"
                size="lg"
              >
                {enrolling ? 'Enrolling...' : 'Continue'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
