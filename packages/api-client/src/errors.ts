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
