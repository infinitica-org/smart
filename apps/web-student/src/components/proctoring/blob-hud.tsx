'use client';

import { useEffect, useState } from 'react';
import type { BlobWsPayload } from '@smart/contracts';

export function BlobHud({ payload }: { payload: BlobWsPayload | null }) {
  const [speak, setSpeak] = useState('');
  const state = payload?.state ?? 'idle';
  const alert = state === 'alert' || state === 'terminated';

  useEffect(() => {
    const message = payload?.message;
    if (!message || typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeak(message);
    const timer = window.setTimeout(() => setSpeak(''), 4000);
    return () => window.clearTimeout(timer);
  }, [payload?.message, payload?.type]);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex items-end gap-3">
      {speak ? (
        <p className="max-w-xs rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-xs text-white">
          {speak}
        </p>
      ) : null}
      <div
        title="AI proctoring active"
        className={`h-14 w-14 rounded-full shadow-lg ${
          alert
            ? 'animate-pulse bg-red-500'
            : state === 'pass_cue'
              ? 'bg-emerald-400'
              : 'bg-teal-400'
        }`}
      />
    </div>
  );
}
