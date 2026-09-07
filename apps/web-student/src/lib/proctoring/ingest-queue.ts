import type { ProctoringViolationKind } from '@smart/contracts';

const DEFAULT_DEBOUNCE_MS = 400;

/**
 * Ingests HMAC-signed violations. Queues until the snapshot secret exists so the
 * first fullscreen/sensor events are not dropped.
 */
export function createProctorIngest(options: {
  getSecret: () => string;
  send: (kind: ProctoringViolationKind) => Promise<void>;
  debounceMs?: number;
}): {
  report: (kind: ProctoringViolationKind) => void;
  flush: () => Promise<void>;
} {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const lastAt: Partial<Record<ProctoringViolationKind, number>> = {};
  const pending: ProctoringViolationKind[] = [];
  let sending = false;

  async function deliver(kind: ProctoringViolationKind): Promise<void> {
    const now = Date.now();
    if (now - (lastAt[kind] ?? 0) < debounceMs) return;
    lastAt[kind] = now;
    await options.send(kind);
  }

  async function drain(): Promise<void> {
    if (sending) return;
    sending = true;
    try {
      while (pending.length > 0 && options.getSecret()) {
        const kind = pending.shift();
        if (kind) await deliver(kind);
      }
    } finally {
      sending = false;
    }
  }

  return {
    report: (kind) => {
      pending.push(kind);
      void drain();
    },
    flush: drain,
  };
}
