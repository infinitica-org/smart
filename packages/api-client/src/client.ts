import type { z } from 'zod';
import { ApiErrorSchema, isSessionHoldCode } from '@smart/contracts';
import {
  SmartApiError,
  SmartContractViolationError,
  SmartNetworkError,
  isSmartApiError,
} from './errors.js';

/**
 * The SMART HTTP client.
 *
 * Every frontend call goes through here. Raw `fetch` in a component is blocked by
 * ESLint, because four things must happen on every request and none of them can
 * be left to memory: response validation against the contract, correlation-id
 * propagation, single-flight refresh on 401, and honouring `Retry-After` on 429.
 *
 * Owner: Satheswaran V.
 */

export interface SmartClientOptions {
  readonly baseUrl: string;
  /**
   * Access-token supplier. A function, not a string: the token rotates, and a
   * captured string means requests start failing 15 minutes after page load.
   */
  readonly getAccessToken?: () => string | null | Promise<string | null>;
  /**
   * Refresh hook, called once on a 401. Returns the new access token, or null to
   * give up and send the user to login.
   */
  readonly refreshAccessToken?: () => Promise<string | null>;
  readonly onUnauthorized?: () => void;
  /** Fired when a 403 session-hold response arrives so portals can show a wall. */
  readonly onSessionHold?: (hold: { code: string; message: string }) => void;
  readonly getCorrelationId?: () => string | undefined;
  readonly defaultTimeoutMs?: number;
  /** Injectable for tests and for server components. */
  readonly fetchImpl?: typeof fetch;
}

export interface RequestOptions<TResponse> {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly query?: Record<string, string | number | boolean | undefined>;
  readonly body?: unknown;
  /** Multipart body. The browser owns its boundary Content-Type header. */
  readonly formData?: FormData;
  readonly responseType?: 'json' | 'blob';
  /** Contract schema. Omit only for endpoints that return no body. */
  readonly schema?: z.ZodType<TResponse>;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  /** Skips the auth header, for public verification endpoints. */
  readonly anonymous?: boolean;
}

export const DEFAULT_TIMEOUT_MS = 15_000;
/** One retry only. A second is usually the same failure and doubles the wait. */
export const MAX_RATE_LIMIT_RETRIES = 1;
/** Cap on honoured Retry-After: past this, showing the user an error is kinder. */
export const MAX_RETRY_AFTER_SECONDS = 5;

export class SmartApiClient {
  private readonly fetchImpl: typeof fetch;
  /**
   * In-flight refresh, shared across concurrent 401s.
   *
   * A results page fires several requests at once. Without single-flight, each
   * 401 triggers its own refresh, and because refresh tokens rotate, all but one
   * rotation is invalidated and the user is logged out for loading a page.
   */
  private refreshInFlight: Promise<string | null> | null = null;

  constructor(private readonly options: SmartClientOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  get<T>(
    path: string,
    options: Omit<RequestOptions<T>, 'path' | 'method' | 'body' | 'formData'> = {},
  ): Promise<T> {
    return this.request<T>({ ...options, path, method: 'GET' });
  }

  getBlob(
    path: string,
    options: Omit<
      RequestOptions<Blob>,
      'path' | 'method' | 'body' | 'formData' | 'schema' | 'responseType'
    > = {},
  ): Promise<Blob> {
    return this.request<Blob>({ ...options, path, method: 'GET', responseType: 'blob' });
  }

  post<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions<T>, 'path' | 'method' | 'body' | 'formData'> = {},
  ): Promise<T> {
    return this.request<T>({ ...options, path, method: 'POST', body });
  }

  postForm<T>(
    path: string,
    formData: FormData,
    options: Omit<RequestOptions<T>, 'path' | 'method' | 'body' | 'formData'> = {},
  ): Promise<T> {
    return this.request<T>({ ...options, path, method: 'POST', formData });
  }

  patch<T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions<T>, 'path' | 'method' | 'body' | 'formData'> = {},
  ): Promise<T> {
    return this.request<T>({ ...options, path, method: 'PATCH', body });
  }

  delete<T>(
    path: string,
    options: Omit<RequestOptions<T>, 'path' | 'method' | 'body' | 'formData'> = {},
  ): Promise<T> {
    return this.request<T>({ ...options, path, method: 'DELETE' });
  }

  async request<T>(options: RequestOptions<T>): Promise<T> {
    return this.execute(options, { refreshed: false, rateLimitRetries: 0 });
  }

  private async execute<T>(
    options: RequestOptions<T>,
    state: { refreshed: boolean; rateLimitRetries: number },
  ): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    const headers = await this.buildHeaders(options);

    const timeoutMs = options.timeoutMs ?? this.options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

    // Honour a caller's abort (component unmount, cancelled assessment) as well
    // as our own timeout.
    const abortListener = (): void => timeoutController.abort();
    options.signal?.addEventListener('abort', abortListener);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.formData ??
          (options.body === undefined ? undefined : JSON.stringify(options.body)),
        // Required for the HttpOnly refresh cookie to travel.
        credentials: 'include',
        signal: timeoutController.signal,
      });
    } catch (cause) {
      if (options.signal?.aborted === true) throw cause;
      throw new SmartNetworkError(
        `Request to ${options.path} failed or timed out after ${String(timeoutMs)}ms.`,
        cause,
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abortListener);
    }

    if (response.status === 401 && !state.refreshed && options.anonymous !== true) {
      const token = await this.refreshOnce();
      if (token === null) {
        this.options.onUnauthorized?.();
      } else {
        return this.execute(options, { ...state, refreshed: true });
      }
    }

    if (response.status === 429 && state.rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
      const waitSeconds = this.retryAfterSeconds(response);
      if (waitSeconds !== null && waitSeconds <= MAX_RETRY_AFTER_SECONDS) {
        await sleep(waitSeconds * 1_000);
        return this.execute(options, { ...state, rateLimitRetries: state.rateLimitRetries + 1 });
      }
    }

    if (!response.ok) {
      const error = await toApiError(response);
      if (isSmartApiError(error) && isSessionHoldCode(error.code)) {
        this.options.onSessionHold?.({ code: error.code, message: error.message });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('smart:session-hold', {
              detail: { code: error.code, message: error.message },
            }),
          );
        }
      }
      throw error;
    }

    if (response.status === 204) return undefined as T;
    if (options.responseType === 'blob') return (await response.blob()) as T;

    const text = await response.text();
    if (text.length === 0) return undefined as T;

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (cause) {
      throw new SmartNetworkError(`Response from ${options.path} was not valid JSON.`, cause);
    }

    if (!options.schema) return json as T;

    const parsed = options.schema.safeParse(json);
    if (!parsed.success) {
      throw new SmartContractViolationError(options.path, parsed.error.issues);
    }
    return parsed.data;
  }

  private async refreshOnce(): Promise<string | null> {
    if (!this.options.refreshAccessToken) return null;
    this.refreshInFlight ??= this.options.refreshAccessToken().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private retryAfterSeconds(response: Response): number | null {
    const header = response.headers.get('retry-after');
    if (header === null) return null;
    const seconds = Number.parseInt(header, 10);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const base = this.options.baseUrl.replace(/\/$/u, '');
    const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private async buildHeaders(options: RequestOptions<unknown>): Promise<Record<string, string>> {
    const headers: Record<string, string> = { accept: 'application/json' };

    if (options.body !== undefined) headers['content-type'] = 'application/json';

    if (options.anonymous !== true && this.options.getAccessToken) {
      const token = await this.options.getAccessToken();
      if (token !== null && token.length > 0) headers.authorization = `Bearer ${token}`;
    }

    const correlationId = this.options.getCorrelationId?.();
    if (correlationId !== undefined) headers['x-correlation-id'] = correlationId;

    return headers;
  }
}

async function toApiError(response: Response): Promise<SmartApiError | SmartNetworkError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // A gateway or proxy failure returns HTML, not our error contract. Synthesise
    // a well-formed error so callers never have to handle a third shape.
    return new SmartApiError({
      error: response.status >= 500 ? 'service_unavailable' : 'internal_error',
      message: `Request failed with status ${String(response.status)}.`,
      statusCode: response.status,
    });
  }

  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) return new SmartApiError(parsed.data);

  return new SmartApiError({
    error: 'internal_error',
    message: `Request failed with status ${String(response.status)}.`,
    statusCode: response.status,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
