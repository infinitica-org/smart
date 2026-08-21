/**
 * PII and secret redaction.
 *
 * SMART logs are read by six engineers, shipped to Loki, and retained. They must
 * not contain a candidate's answers, a JWT, or an API key. Redaction is
 * centralised here rather than left to each logger call, because "remember to
 * redact" fails exactly once and then it is in the log store forever.
 *
 * Owner: Vishal V.
 */

/**
 * Paths pino removes before serialisation.
 *
 * Two categories, both non-negotiable:
 *   - credentials, because a leaked log line is a leaked account;
 *   - candidate response content, because an item's answer in a log is an item
 *     leak, and a leaked item bank invalidates the assessment it belongs to.
 */
export const REDACTED_PATHS: readonly string[] = [
  // --- credentials & tokens ---
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  'password',
  'currentPassword',
  'newPassword',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apiKeySecret',
  'clientSecret',
  'secret',
  'privateKey',
  'samlAssertion',
  '*.password',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',

  // --- assessment content: logging this leaks the item bank ---
  'answer',
  'answerKey',
  'correctOptionId',
  'candidateResponse',
  'responseText',
  'code',
  'transcript',
  '*.answer',
  '*.answerKey',
  '*.candidateResponse',

  // --- personal data ---
  'email',
  'phone',
  'dateOfBirth',
  'rollNumber',
  '*.email',
  '*.phone',
];

export const REDACTION_PLACEHOLDER = '[redacted]';

/**
 * Fields that are safe — and required — on every log line.
 *
 * Kept as an explicit allowlist so that "what can I log about a candidate?" has
 * a written answer instead of six different judgement calls.
 */
export const SAFE_CORRELATION_FIELDS: readonly string[] = [
  'correlationId',
  'requestId',
  'userId',
  'institutionId',
  'attemptId',
  'responseId',
  'trackCode',
  'levelNumber',
  'module',
  'route',
  'statusCode',
  'durationMs',
];

/**
 * Redact a plain object for contexts pino does not cover — Kafka payload dumps,
 * error metadata, audit diffs.
 *
 * Depth-limited: a cyclic or pathologically nested payload must not be able to
 * hang a logger call on the request path.
 */
export function redactObject(value: unknown, depth = 0): unknown {
  const MAX_DEPTH = 6;
  if (depth > MAX_DEPTH) return '[max-depth]';

  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((entry) => redactObject(entry, depth + 1));

  const sensitive = new Set(
    REDACTED_PATHS.filter((path) => !path.includes('.') && !path.includes('[')).map((path) =>
      path.toLowerCase(),
    ),
  );

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = sensitive.has(key.toLowerCase())
      ? REDACTION_PLACEHOLDER
      : redactObject(entry, depth + 1);
  }
  return output;
}

/**
 * Mask an email for the rare case where it genuinely helps support resolve a
 * ticket — `a***@example.com`. Prefer `userId`.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return REDACTION_PLACEHOLDER;
  const first = email[0] ?? '';
  return `${first}***${email.slice(at)}`;
}
