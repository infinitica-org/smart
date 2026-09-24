import type { ApiError, ApiErrorCode } from '@smart/contracts';

/**
 * Client-side error types.
 *
 * The frontend switches on `code`, never on `message`. Message text is written
 * for humans and will be reworded; a UI branch built on it breaks silently the
 * first time someone improves the copy.
 *
 * Owner: Satheswaran V.
 */

export class SmartApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly statusCode: number;
  /** Correlation id. Surface this in any error UI — it is how support finds the log. */
  readonly traceId: string | undefined;
  readonly details: readonly { path: string; message: string }[];
  readonly retryAfterSeconds: number | undefined;

  constructor(body: ApiError) {
    super(body.message);
    this.name = 'SmartApiError';
    this.code = body.error;
    this.statusCode = body.statusCode;
    this.traceId = body.traceId;
    this.details = body.details ?? [];
    this.retryAfterSeconds = body.retryAfterSeconds;
  }

  /** True for 5xx and rate limits — the request may succeed if repeated. */
  get isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 429;
  }

  /** True when the user must re-authenticate rather than retry. */
  get requiresLogin(): boolean {
    return this.code === 'unauthorized' || this.code === 'token_expired';
  }

  /**
   * Field errors keyed by form field, for direct use in form UIs.
   * Saves every form re-deriving the same mapping.
   */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const detail of this.details) {
      map[detail.path] = detail.message;
    }
    return map;
  }
}

/**
 * Network-level failure: the request never got an HTTP response.
 *
 * Distinguished from `SmartApiError` because the UI response is different — an
 * offline candidate mid-assessment needs "your connection dropped, we saved your
 * answers", not a server error.
 */
export class SmartNetworkError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'SmartNetworkError';
  }
}

/**
 * The server returned 2xx but the body did not match the contract.
 *
 * Treated as an error rather than passed through, because a silently-changed
 * response shape becomes a runtime crash deep in a component tree. Failing at
 * the boundary means the bug report names the endpoint.
 */
export class SmartContractViolationError extends Error {
  constructor(
    readonly route: string,
    readonly issues: unknown,
  ) {
    super(
      `Response from ${route} did not match its contract. The API and @smart/contracts ` +
        `are out of sync — check the contract version before working around this. ` +
        `Issues: ${JSON.stringify(issues)}`,
    );
    this.name = 'SmartContractViolationError';
  }
}

export function isSmartApiError(error: unknown): error is SmartApiError {
  return error instanceof SmartApiError;
}

/** The message the API sends when it only knows "the body did not validate". */
export const GENERIC_VALIDATION_MESSAGE = 'Request failed validation.';

/** "verification.registeredAddress.line1" -> "Line1"; "phone" -> "Phone"; array indexes are skipped. */
function labelFromPath(path: string): string {
  const last = path
    .split('.')
    .filter((part) => part !== '' && !/^\d+$/.test(part))
    .pop();
  if (!last) return '';
  const words = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const MAX_LISTED_DETAILS = 4;

/**
 * One user-facing sentence for any failed request.
 *
 * - A specific server message ("Verify your corporate email before submitting.") is shown as is.
 * - The generic "Request failed validation." is replaced by the actual field problems, so the
 *   user learns which field to fix.
 * - Anything else falls back to the error message, then to `fallback`.
 */
export function describeApiError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof SmartApiError) {
    const specific = error.message && error.message !== GENERIC_VALIDATION_MESSAGE;
    if (specific) return error.message;

    if (error.details.length > 0) {
      const lines: string[] = [];
      for (const detail of error.details) {
        const label = labelFromPath(detail.path);
        const line = label ? `${label}: ${detail.message}` : detail.message;
        if (!lines.includes(line)) lines.push(line);
      }
      const shown = lines.slice(0, MAX_LISTED_DETAILS);
      const rest = lines.length - shown.length;
      return rest > 0 ? `${shown.join(' ')} (+${String(rest)} more)` : shown.join(' ');
    }
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
