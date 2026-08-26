'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { Clock } from 'lucide-react';

export interface TimerProps {
  /** The total duration of the assessment in seconds. */
  duration: number;
  /** ISO string of when the timer started on the server. */
  startedAt: string;
  /** ISO string of the current time on the server (to reconcile drift). */
  serverNow: string;
  /** Callback fired when the timer reaches 0. */
  onExpire?: () => void;
  className?: string;
}

export function Timer({ duration, startedAt, serverNow, onExpire, className }: TimerProps) {
  // We use serverNow to compute the initial offset between client time and server time.
  const [clientOffset] = useState(() => {
    return Date.now() - new Date(serverNow).getTime();
  });

  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const endServerTime = new Date(startedAt).getTime() + duration * 1000;

    const interval = setInterval(() => {
      const currentServerTime = Date.now() - clientOffset;
      const remainingMs = endServerTime - currentServerTime;

      if (remainingMs <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        onExpire?.();
      } else {
        setTimeLeft(Math.ceil(remainingMs / 1000));
      }
    }, 1000);

    // Run once immediately to avoid 1s initial delay
    const initialRemainingMs = endServerTime - (Date.now() - clientOffset);
    if (initialRemainingMs <= 0) {
      setTimeLeft(0);
      onExpire?.();
    } else {
      setTimeLeft(Math.ceil(initialRemainingMs / 1000));
    }

    return () => clearInterval(interval);
  }, [duration, startedAt, clientOffset, onExpire]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft > 0 && timeLeft <= 300; // 5 minutes warning
  const isDanger = timeLeft > 0 && timeLeft <= 60; // 1 minute danger

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-sm font-medium transition-colors',
        isDanger
          ? 'border-danger/50 bg-danger/10 text-danger'
          : isWarning
            ? 'border-warning/50 bg-warning/10 text-warning-foreground'
            : 'bg-transparent text-[var(--text-primary)]',
        className,
      )}
      aria-live="polite"
      role="timer"
    >
      <Clock className="h-4 w-4" />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
}
