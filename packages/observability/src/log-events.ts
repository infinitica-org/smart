/**
 * Catalog of structured log event names.
 *
 * Free-text event strings drift; this catalog is the contract Loki dashboards
 * and on-call greps rely on. Prefer `logEvent` over inventing a new string.
 *
 * Owner: Vishal V.
 */

export const LOG_EVENTS = {
  HTTP_REQUEST: 'http.request',
  HTTP_CLIENT_ERROR: 'http.client_error',
  HTTP_UNHANDLED_ERROR: 'http.unhandled_error',
  KAFKA_EMIT_SKIPPED: 'kafka.emit_skipped',
  KAFKA_EMIT_FAILED: 'kafka.emit_failed',
  REDIS_DEGRADED: 'redis.degraded',
  POSTGRES_DEGRADED: 'postgres.degraded',
  AI_PROVIDER_FAILED: 'ai.provider_failed',
  /** Pairs with Prometheus `smart_rate_limit_rejections_total`. */
  RATE_LIMIT_EXCEEDED: 'smart.rate_limit.exceeded',
} as const;

export type LogEventName = (typeof LOG_EVENTS)[keyof typeof LOG_EVENTS];

/** Required fields per event — unit tests pin these. */
export const LOG_EVENT_REQUIRED_FIELDS: Record<LogEventName, readonly string[]> = {
  [LOG_EVENTS.HTTP_REQUEST]: ['route', 'statusCode'],
  [LOG_EVENTS.HTTP_CLIENT_ERROR]: ['route', 'statusCode', 'error'],
  [LOG_EVENTS.HTTP_UNHANDLED_ERROR]: ['route', 'statusCode'],
  [LOG_EVENTS.KAFKA_EMIT_SKIPPED]: ['topic'],
  [LOG_EVENTS.KAFKA_EMIT_FAILED]: ['topic'],
  [LOG_EVENTS.REDIS_DEGRADED]: ['policyKey'],
  [LOG_EVENTS.POSTGRES_DEGRADED]: [],
  [LOG_EVENTS.AI_PROVIDER_FAILED]: ['provider'],
  [LOG_EVENTS.RATE_LIMIT_EXCEEDED]: ['policy', 'route'],
};

export type LogLevel = 'log' | 'warn' | 'error' | 'debug';

/** Duck-typed logger — Nest `Logger` or pino. No Nest dependency in this package. */
export interface StructuredLogger {
  log?(message: unknown, ...optionalParams: unknown[]): void;
  info?(obj: object, msg?: string, ...args: unknown[]): void;
  warn(message: unknown, ...optionalParams: unknown[]): void;
  error(message: unknown, ...optionalParams: unknown[]): void;
  debug?(message: unknown, ...optionalParams: unknown[]): void;
}

export function assertLogEventFields(event: LogEventName, fields: Record<string, unknown>): void {
  for (const key of LOG_EVENT_REQUIRED_FIELDS[event]) {
    if (fields[key] === undefined) {
      throw new Error(`Log event "${event}" requires field "${key}"`);
    }
  }
}

/**
 * Emit a catalogued structured log line.
 *
 * Nest `Logger` uses `log` for info; pino uses `info`. Both are accepted.
 */
export function logEvent(
  logger: StructuredLogger,
  level: LogLevel,
  event: LogEventName,
  fields: Record<string, unknown>,
  message: string,
): void {
  assertLogEventFields(event, fields);
  const payload = { event, ...fields };

  if (level === 'log' && typeof logger.info === 'function' && typeof logger.log !== 'function') {
    logger.info(payload, message);
    return;
  }

  switch (level) {
    case 'log':
      logger.log?.(payload, message);
      break;
    case 'warn':
      logger.warn(payload, message);
      break;
    case 'error':
      logger.error(payload, message);
      break;
    case 'debug':
      logger.debug?.(payload, message);
      break;
  }
}
