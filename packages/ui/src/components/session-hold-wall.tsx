'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { AuthenticatedUser } from '@smart/contracts';
import { Button } from './button';

export interface SessionHoldState {
  code: string;
  message: string;
}

export function SessionHoldWall({
  children,
  getAccessToken,
  pollMe,
  onSignOut,
}: {
  children: ReactNode;
  getAccessToken: () => string | null;
  pollMe: () => Promise<Pick<AuthenticatedUser, 'sessionHold'>>;
  onSignOut: () => void | Promise<void>;
}) {
  const [hold, setHold] = useState<SessionHoldState | null>(null);

  const refreshHold = useCallback(async () => {
    if (!getAccessToken()) {
      setHold(null);
      return;
    }
    try {
      const me = await pollMe();
      setHold(me.sessionHold);
    } catch {
      // 403 from other calls sets the wall via the client callback; ignore poll errors.
    }
  }, [getAccessToken, pollMe]);

  useEffect(() => {
    const onHold = (event: Event) => {
      const detail = (event as CustomEvent<SessionHoldState>).detail;
      if (detail?.message) setHold(detail);
    };
    window.addEventListener('smart:session-hold', onHold);
    void refreshHold();
    const timer = window.setInterval(() => void refreshHold(), 15_000);
    return () => {
      window.removeEventListener('smart:session-hold', onHold);
      window.clearInterval(timer);
    };
  }, [refreshHold]);

  return (
    <>
      {children}
      {hold ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-hold-title"
        >
          <div className="max-w-md w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-xl space-y-4">
            <h1 id="session-hold-title" className="text-lg font-semibold">
              Access paused
            </h1>
            <p className="text-sm text-[var(--text-muted)]">{hold.message}</p>
            <Button type="button" variant="secondary" onClick={() => void onSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
