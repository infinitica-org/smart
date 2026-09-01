import { HttpException, Injectable, Logger, Optional } from '@nestjs/common';
import type { AiProvider } from '@smart/contracts';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export interface ProviderCircuitInfo {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  /** At most one in-flight request may probe while HALF_OPEN. */
  probeInFlight: boolean;
}

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly provider: AiProvider) {
    super(`Circuit breaker is OPEN for provider: ${provider}`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class AiGatewayAllProvidersFailedError extends HttpException {
  constructor(
    public readonly errors: Array<{ provider: AiProvider; message: string; circuitState: string }>,
  ) {
    const details = errors
      .map((e) => `[${e.provider} (${e.circuitState})]: ${e.message}`)
      .join(', ');
    super(
      {
        error: 'ai_provider_unavailable',
        message: `AI Gateway: All providers failed or circuits are open. Details: ${details}`,
        details: errors.map((e) => ({ path: e.provider, message: e.message })),
      },
      503, // HttpStatus.SERVICE_UNAVAILABLE
    );
    this.name = 'AiGatewayAllProvidersFailedError';
  }
}

function numericHttpStatus(error: Record<string, unknown>): number | undefined {
  const candidates = [error.status, error.statusCode, error.status_code];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

export function isCircuitBreakerTriggerError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof CircuitBreakerOpenError) return true;

  const err = error as Record<string, unknown>;
  const status = numericHttpStatus(err);
  if (typeof status === 'number' && (status === 429 || (status >= 500 && status < 600))) {
    return true;
  }

  const name = String(err.name ?? '');
  if (name === 'AbortError' || name === 'TimeoutError') {
    return true;
  }

  const message = String(err.message ?? '').toLowerCase();
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout')
  ) {
    return true;
  }

  return false;
}

@Injectable()
export class AiCircuitBreaker {
  private readonly logger = new Logger(AiCircuitBreaker.name);
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly requestTimeoutMs: number;

  private readonly circuits = new Map<AiProvider, ProviderCircuitInfo>();

  constructor(@Optional() options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 30_000;
    this.requestTimeoutMs = options?.requestTimeoutMs ?? 15_000;
  }

  private getOrCreate(provider: AiProvider): ProviderCircuitInfo {
    let info = this.circuits.get(provider);
    if (!info) {
      info = {
        state: 'CLOSED',
        consecutiveFailures: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        probeInFlight: false,
      };
      this.circuits.set(provider, info);
    }
    return info;
  }

  getState(provider: AiProvider): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    const info = this.getOrCreate(provider);
    if (info.state === 'OPEN' && info.lastFailureTime !== null) {
      const elapsed = Date.now() - info.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        info.state = 'HALF_OPEN';
        this.logger.log(
          `Circuit for provider ${provider} transitioned from OPEN to HALF_OPEN (probe allowed)`,
        );
      }
    }
    return info.state;
  }

  isCallAllowed(provider: AiProvider): boolean {
    const state = this.getState(provider);
    if (state === 'CLOSED') return true;
    if (state === 'HALF_OPEN') {
      return !this.getOrCreate(provider).probeInFlight;
    }
    return false;
  }

  recordSuccess(provider: AiProvider): void {
    const info = this.getOrCreate(provider);
    const prevState = info.state;
    info.consecutiveFailures = 0;
    info.state = 'CLOSED';
    info.probeInFlight = false;
    info.lastSuccessTime = Date.now();
    if (prevState !== 'CLOSED') {
      this.logger.log(`Circuit for provider ${provider} recovered to CLOSED`);
    }
  }

  recordFailure(provider: AiProvider, error: unknown): void {
    const info = this.getOrCreate(provider);
    info.lastFailureTime = Date.now();
    info.probeInFlight = false;
    const isTrigger = isCircuitBreakerTriggerError(error);

    if (info.state === 'HALF_OPEN') {
      info.state = 'OPEN';
      this.logger.warn(
        `Probe in HALF_OPEN failed for provider ${provider}. Circuit tripped back to OPEN.`,
      );
      return;
    }

    if (isTrigger) {
      info.consecutiveFailures += 1;
      if (info.consecutiveFailures >= this.failureThreshold) {
        info.state = 'OPEN';
        this.logger.error(
          `Circuit tripped to OPEN for provider ${provider} after ${info.consecutiveFailures} consecutive trigger failures.`,
        );
      }
    }
  }

  trip(provider: AiProvider): void {
    const info = this.getOrCreate(provider);
    info.state = 'OPEN';
    info.lastFailureTime = Date.now();
    info.consecutiveFailures = this.failureThreshold;
    info.probeInFlight = false;
    this.logger.warn(`Circuit for provider ${provider} explicitly tripped to OPEN`);
  }

  reset(provider: AiProvider): void {
    const info = this.getOrCreate(provider);
    info.state = 'CLOSED';
    info.consecutiveFailures = 0;
    info.lastFailureTime = null;
    info.lastSuccessTime = Date.now();
    info.probeInFlight = false;
  }

  async execute<T>(
    provider: AiProvider,
    fn: (signal?: AbortSignal) => Promise<T>,
    timeoutMs?: number,
  ): Promise<T> {
    const info = this.getOrCreate(provider);
    const state = this.getState(provider);
    if (state === 'OPEN' || (state === 'HALF_OPEN' && info.probeInFlight)) {
      throw new CircuitBreakerOpenError(provider);
    }
    if (state === 'HALF_OPEN') {
      info.probeInFlight = true;
    }

    const effectiveTimeout = timeoutMs ?? this.requestTimeoutMs;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        const timeoutErr = new Error(
          `Request timed out after ${effectiveTimeout}ms for provider ${provider}`,
        );
        timeoutErr.name = 'TimeoutError';
        reject(timeoutErr);
      }, effectiveTimeout);
    });

    try {
      const result = await Promise.race([fn(controller.signal), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      this.recordSuccess(provider);
      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      this.recordFailure(provider, err);
      throw err;
    }
  }
}
