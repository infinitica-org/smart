import { CORRELATION_KAFKA_HEADER, resolveCorrelationId } from './correlation.js';
import { runWithContext, type LoggerContext } from './logger.js';

/**
 * Kafka consumer / producer correlation helpers.
 *
 * Producers attach `CORRELATION_KAFKA_HEADER`; consumers re-enter ALS via
 * `runKafkaHandler` so log lines match the originating HTTP request.
 *
 * Owner: Vishal V.
 */

export type KafkaHeaderValue = Buffer | string | (Buffer | string)[] | undefined;
export type KafkaHeaders = Record<string, KafkaHeaderValue> | undefined;

/** Decode a Kafka header value to a UTF-8 string. */
export function kafkaHeaderToString(value: KafkaHeaderValue): string | undefined {
  const entry = Array.isArray(value) ? value[0] : value;
  if (entry === undefined) return undefined;
  if (Buffer.isBuffer(entry)) return entry.toString('utf8');
  if (typeof entry === 'string') return entry;
  return undefined;
}

/** Resolve correlation from Kafka headers (mint if missing/invalid). */
export function correlationIdFromKafkaHeaders(headers: KafkaHeaders): string {
  return resolveCorrelationId(kafkaHeaderToString(headers?.[CORRELATION_KAFKA_HEADER]));
}

/** Headers to attach on produce. Returns undefined when no correlation is available. */
export function kafkaCorrelationHeaders(
  correlationId?: string,
): Record<string, Buffer> | undefined {
  if (!correlationId) return undefined;
  return { [CORRELATION_KAFKA_HEADER]: Buffer.from(correlationId, 'utf8') };
}

export interface RunKafkaHandlerOptions {
  readonly module?: string;
  readonly extraContext?: Omit<LoggerContext, 'correlationId' | 'module'>;
}

/**
 * Run a Kafka message handler inside ALS correlation context.
 * First real consumer (evaluation/AI) imports this — no new worker app required.
 */
export function runKafkaHandler<T>(
  headers: KafkaHeaders,
  fn: () => T,
  options: RunKafkaHandlerOptions = {},
): T {
  const correlationId = correlationIdFromKafkaHeaders(headers);
  return runWithContext(
    {
      correlationId,
      module: options.module ?? 'kafka-consumer',
      ...options.extraContext,
    },
    fn,
  );
}
