import { ProctoringViolationKindSchema, type ProctoringViolationKind } from '@smart/contracts';

import { env } from '../../platform/config/env.js';

export type CvAnalyzeResult = {
  violations: ProctoringViolationKind[];

  yaw?: number;

  pitch?: number;

  faceCount?: number;
};

/**
 * SEC-02 / I565: Responsible AI Governance restriction.
 * Prohibits facial-expression, emotion, attention, and personality inference.
 * Only physical presence (face count, gaze direction/head pose, hardware absence) is permissible.
 */
export const PROHIBITED_INFERENCES = new Set([
  'EMOTION',
  'EXPRESSION',
  'PERSONALITY',
  'STRESS_LEVEL',
  'DECEPTION_DETECTION',
]);

function coerceViolations(raw: unknown): ProctoringViolationKind[] {
  if (!Array.isArray(raw)) return [];

  const kinds: ProctoringViolationKind[] = [];

  for (const entry of raw) {
    if (typeof entry === 'string' && PROHIBITED_INFERENCES.has(entry.toUpperCase())) {
      // Guardrail active: ignore prohibited emotion/personality inference
      continue;
    }
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
