import { Injectable, Logger } from '@nestjs/common';
import type { ConnectableSignalSourceId } from '@smart/contracts';

export class SignalCircuitOpenError extends Error {
  constructor(public readonly sourceId: ConnectableSignalSourceId) {
    super(`Circuit breaker is OPEN for signal source: ${sourceId}`);
    this.name = 'SignalCircuitOpenError';
  }
}

interface CircuitState {
  consecutiveFailures: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastFailureTime: number | null;
  probeInFlight: boolean;
}

/**
 * Per-source circuit breaker for third-party profile fetches (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class SignalCircuitBreaker {
  private readonly logger = new Logger(SignalCircuitBreaker.name);
  private readonly failureThreshold = 5;
  private readonly resetTimeoutMs = 120_000;
  private readonly circuits = new Map<ConnectableSignalSourceId, CircuitState>();

  private getOrCreate(sourceId: ConnectableSignalSourceId): CircuitState {
    let info = this.circuits.get(sourceId);
    if (!info) {
      info = {
        consecutiveFailures: 0,
        state: 'CLOSED',
        lastFailureTime: null,
        probeInFlight: false,
      };
      this.circuits.set(sourceId, info);
    }
    return info;
  }

  private currentState(sourceId: ConnectableSignalSourceId): CircuitState['state'] {
    const info = this.getOrCreate(sourceId);
    if (info.state === 'OPEN' && info.lastFailureTime !== null) {
      if (Date.now() - info.lastFailureTime >= this.resetTimeoutMs) {
        info.state = 'HALF_OPEN';
      }
    }
    return info.state;
  }

  isCallAllowed(sourceId: ConnectableSignalSourceId): boolean {
    const state = this.currentState(sourceId);
    if (state === 'CLOSED') return true;
    if (state === 'HALF_OPEN') return !this.getOrCreate(sourceId).probeInFlight;
    return false;
  }

  recordSuccess(sourceId: ConnectableSignalSourceId): void {
    const info = this.getOrCreate(sourceId);
    info.consecutiveFailures = 0;
    info.state = 'CLOSED';
    info.probeInFlight = false;
  }

  recordFailure(sourceId: ConnectableSignalSourceId): void {
    const info = this.getOrCreate(sourceId);
    info.lastFailureTime = Date.now();
    info.probeInFlight = false;
    info.consecutiveFailures += 1;
    if (info.consecutiveFailures >= this.failureThreshold) {
      info.state = 'OPEN';
      this.logger.warn(
        `Signal circuit OPEN for ${sourceId} after ${info.consecutiveFailures} failures`,
      );
    }
  }

  async execute<T>(
    sourceId: ConnectableSignalSourceId,
    fn: (signal: AbortSignal) => Promise<T>,
    timeoutMs = 4_000,
  ): Promise<T> {
    if (!this.isCallAllowed(sourceId)) {
      throw new SignalCircuitOpenError(sourceId);
    }

    const info = this.getOrCreate(sourceId);
    if (info.state === 'HALF_OPEN') {
      info.probeInFlight = true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await fn(controller.signal);
      this.recordSuccess(sourceId);
      return result;
    } catch (error) {
      this.recordFailure(sourceId);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
