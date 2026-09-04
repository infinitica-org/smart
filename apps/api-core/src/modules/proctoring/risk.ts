import type { ProctoringSeverity, ProctoringViolationKind } from '@smart/contracts';

const WEIGHT: Record<ProctoringSeverity, number> = { low: 1, medium: 3, high: 7 };

export type StoredViolation = {
  kind: ProctoringViolationKind;
  severity: ProctoringSeverity;
  ts: number;
};

export function integrityScore(events: StoredViolation[], rapidAnswering = false): number {
  let score = events.reduce((sum, event) => sum + (WEIGHT[event.severity] ?? 1), 0);
  if (rapidAnswering) score += 8;
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  for (let i = 0; i < sorted.length; i += 1) {
    const left = sorted[i];
    if (!left) continue;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const right = sorted[j];
      if (!right) continue;
      const delta = Math.abs(right.ts - left.ts) / 1000;
      const pair = new Set([left.kind, right.kind]);
      if (delta <= 30 && pair.has('DEVTOOLS_OPEN') && pair.has('TAB_BLUR')) score += 5;
      if (
        delta <= 15 &&
        left.kind === 'OS_KEY' &&
        (right.kind === 'HEARTBEAT_LOST' || right.kind === 'TAB_BLUR')
      ) {
        score += 5;
      }
      if (
        delta <= 60 &&
        pair.has('MULTIPLE_FACES') &&
        (pair.has('TAB_BLUR') || pair.has('FULLSCREEN_EXIT'))
      ) {
        score += 3;
      }
    }
  }
  for (const start of sorted) {
    const window = sorted.filter((event) => event.ts >= start.ts && event.ts - start.ts <= 60_000);
    if (window.length >= 3) {
      score += 4;
      break;
    }
  }
  return score;
}

export function bandForScore(score: number): 'CLEAN' | 'MINOR' | 'MAJOR' {
  if (score < 6) return 'CLEAN';
  if (score < 15) return 'MINOR';
  return 'MAJOR';
}
