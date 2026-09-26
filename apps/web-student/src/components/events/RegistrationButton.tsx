'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PublicCareerEvent } from '@smart/contracts';
import { Alert, Badge, Button } from '@smart/ui';
import { api } from '@/lib/api';

export const EVENTS_KEY = ['campus', 'events'] as const;

/**
 * Th6-451 — Register / Registered / Waitlisted for one event. The server decides the seat under a lock,
 * so a full event simply answers "Waitlisted"; registering twice returns the same registration.
 */
export function RegistrationButton({ event }: { event: PublicCareerEvent }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY });

  const register = useMutation({
    mutationFn: () => api.campus.registerForEvent(event.id),
    onSuccess: refresh,
    onError: (failure) =>
      setError(failure instanceof Error ? failure.message : 'Could not register. Try again.'),
  });
  const cancel = useMutation({
    mutationFn: () => api.campus.cancelEventRegistration(event.id),
    onSuccess: refresh,
    onError: (failure) =>
      setError(failure instanceof Error ? failure.message : 'Could not cancel. Try again.'),
  });

  if (event.cancelled) {
    return <Badge variant="destructive">Cancelled</Badge>;
  }

  const busy = register.isPending || cancel.isPending;
  const full = event.capacityLeft === 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {event.myRegistration === 'REGISTERED' ? <Badge variant="success">Registered</Badge> : null}
        {event.myRegistration === 'WAITLISTED' ? <Badge variant="warning">Waitlisted</Badge> : null}
        {event.myRegistration ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError(null);
              cancel.mutate();
            }}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel registration'}
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              setError(null);
              register.mutate();
            }}
          >
            {register.isPending ? 'Registering…' : full ? 'Join waitlist' : 'Register'}
          </Button>
        )}
      </div>
      {error ? (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
