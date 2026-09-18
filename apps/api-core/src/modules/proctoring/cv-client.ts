import { ProctoringViolationKindSchema, type ProctoringViolationKind } from '@smart/contracts';

import { env } from '../../platform/config/env.js';

export type CvAnalyzeResult = {
  violations: ProctoringViolationKind[];

  yaw?: number;

  pitch?: number;

  faceCount?: number;
};

function coerceViolations(raw: unknown): ProctoringViolationKind[] {
  if (!Array.isArray(raw)) return [];

  const kinds: ProctoringViolationKind[] = [];

  for (const entry of raw) {
    const parsed = ProctoringViolationKindSchema.safeParse(entry);

    if (parsed.success) kinds.push(parsed.data);
  }

  return kinds;
}

/** Calls the proctoring CV sidecar. Returns empty on stub/disabled/failure. */

export async function analyzeProctoringSnapshot(objectKey: string): Promise<CvAnalyzeResult> {
  if (env.PROCTORING_CV_PROVIDER === 'stub') {
    return { violations: [] };
  }

  try {
    const response = await fetch(`${env.PROCTORING_CV_URL}/analyze`, {
      method: 'POST',

      headers: { 'content-type': 'application/json' },

      body: JSON.stringify({ objectKey }),

      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return { violations: [] };

    const body = (await response.json()) as {
      violations?: unknown;

      yaw?: number;

      pitch?: number;

      faceCount?: number;
    };

    return {
      violations: coerceViolations(body.violations),

      yaw: body.yaw,

      pitch: body.pitch,

      faceCount: body.faceCount,
    };
  } catch {
    return { violations: [] };
  }
}
