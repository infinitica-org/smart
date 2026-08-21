import type { z } from 'zod';

/**
 * Output guardrails.
 *
 * An LLM returns a string. A grade is a number that decides whether someone gets
 * an interview. Everything between those two facts happens here, and it fails
 * closed: unparseable output escalates to a human, it never degrades into a
 * guessed score.
 *
 * Owner: Ramansh.
 */

export type GuardrailOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly repaired: boolean }
  | { readonly ok: false; readonly reason: GuardrailFailure; readonly detail: string };

export type GuardrailFailure =
  'NOT_JSON' | 'SCHEMA_MISMATCH' | 'EMPTY_OUTPUT' | 'REFUSAL' | 'SUSPECTED_INJECTION_ECHO';

/**
 * Phrases that indicate the model declined rather than graded.
 *
 * A refusal that slipped through schema validation as a low score would be
 * indistinguishable from a genuinely bad answer, so it is detected explicitly
 * and escalated instead.
 */
const REFUSAL_MARKERS = [
  "i can't help",
  'i cannot help',
  "i'm unable to",
  'i am unable to',
  'as an ai language model',
  'i cannot assist with',
  "i won't be able to",
];

/**
 * Signs the model repeated our instructions back, which usually means a prompt
 * injection succeeded in redirecting it.
 */
const INJECTION_ECHO_MARKERS = ['authority limit', 'scoring discipline', 'untrusted input'];

/**
 * Strip the markdown fence models add despite being told not to.
 *
 * Tolerated rather than treated as a failure: it is the single most common
 * deviation, it is unambiguous to undo, and failing the call would burn a retry
 * and a candidate's time over formatting.
 */
export function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/u.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
}

/**
 * Extract the outermost JSON object when a model wraps it in prose.
 * Returns null rather than a best guess when the braces do not balance.
 */
export function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return raw.slice(start, index + 1);
    }
  }

  return null;
}

/**
 * Validate raw model output against a prompt's output schema.
 *
 * `repaired` is true when the payload needed fence-stripping or prose
 * extraction. The gateway logs that: a template whose repair rate climbs is a
 * template that needs rewording, and without the signal we would not notice.
 */
export function parseModelOutput<T>(raw: string, schema: z.ZodType<T>): GuardrailOutcome<T> {
  if (raw.trim().length === 0) {
    return { ok: false, reason: 'EMPTY_OUTPUT', detail: 'Model returned an empty string.' };
  }

  const lower = raw.toLowerCase();

  const refusal = REFUSAL_MARKERS.find((marker) => lower.includes(marker));
  if (refusal !== undefined) {
    return {
      ok: false,
      reason: 'REFUSAL',
      detail: `Model declined the task (matched "${refusal}"). Escalate to a human rater rather than scoring this.`,
    };
  }

  const echo = INJECTION_ECHO_MARKERS.find((marker) => lower.includes(marker));
  if (echo !== undefined) {
    return {
      ok: false,
      reason: 'SUSPECTED_INJECTION_ECHO',
      detail: `Output echoed prompt scaffolding ("${echo}"), which suggests the candidate response redirected the model. Escalate and flag the attempt.`,
    };
  }

  const defenced = stripCodeFence(raw);
  let repaired = defenced !== raw.trim();

  let candidate = defenced;
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(candidate);
  } catch {
    const extracted = extractJsonObject(defenced);
    if (extracted === null) {
      return {
        ok: false,
        reason: 'NOT_JSON',
        detail: `Output is not JSON and contains no balanced object. First 200 chars: ${raw.slice(0, 200)}`,
      };
    }
    candidate = extracted;
    repaired = true;
    try {
      parsedJson = JSON.parse(candidate);
    } catch {
      return {
        ok: false,
        reason: 'NOT_JSON',
        detail: `Extracted object still failed to parse. First 200 chars: ${candidate.slice(0, 200)}`,
      };
    }
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    return {
      ok: false,
      reason: 'SCHEMA_MISMATCH',
      detail: `Output did not satisfy the prompt's output schema: ${JSON.stringify(result.error.issues)}`,
    };
  }

  return { ok: true, value: result.data, repaired };
}

/**
 * Whether a failure is worth retrying against the same model.
 *
 * Formatting problems are retryable. A refusal or an injection echo is not — the
 * same input will produce the same result, and retrying just delays the human
 * review that is actually needed.
 */
export function isRetryable(reason: GuardrailFailure): boolean {
  return reason === 'NOT_JSON' || reason === 'SCHEMA_MISMATCH' || reason === 'EMPTY_OUTPUT';
}

/** Retry budget per AI call before escalating to a human rater. */
export const MAX_GUARDRAIL_RETRIES = 2;
