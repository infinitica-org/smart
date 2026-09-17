'use client';

import { useCallback, useEffect, useState } from 'react';

/** Client-side cooldown map keyed by action id (e.g. work experience id). */
export function usePerActionCooldown(defaultMs: number) {
  const [untilByKey, setUntilByKey] = useState<Record<string, number>>({});
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const startCooldown = useCallback(
    (key: string, ms: number = defaultMs) => {
      setUntilByKey((prev) => ({ ...prev, [key]: Date.now() + ms }));
    },
    [defaultMs],
  );

  const remainingMs = useCallback(
    (key: string) => Math.max(0, (untilByKey[key] ?? 0) - Date.now()),
    [untilByKey],
  );

  const isCoolingDown = useCallback((key: string) => remainingMs(key) > 0, [remainingMs]);

  return { startCooldown, remainingMs, isCoolingDown };
}

export function formatCooldownLabel(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}
