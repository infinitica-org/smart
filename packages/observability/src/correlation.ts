import { randomUUID } from 'node:crypto';

/**
 * Correlation-id propagation.
 *
 * One id follows a request from the browser, through the gateway, into a Kafka
 * event, into the worker that grades it, and onto the log line that explains why
 * it failed. Without it, "candidate X's L3 result never appeared" is unanswerable
 * in a system with eight services.
 *
 * Owner: Vishal V.
 */

export const CORRELATION_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/** Kafka header key. Byte-array values, so producers must encode. */
export const CORRELATION_KAFKA_HEADER = 'correlation-id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Accept an inbound correlation id, or mint one.
 *
 * Inbound values are validated as UUIDs before use. A correlation id reaches log
 * fields and metric labels, so accepting arbitrary client input would let a
 * caller forge log entries or blow up label cardinality.
 */
export function resolveCorrelationId(inbound: string | string[] | undefined): string {
  const candidate = Array.isArray(inbound) ? inbound[0] : inbound;
  if (typeof candidate === 'string' && UUID_PATTERN.test(candidate)) return candidate;
  return randomUUID();
}

export function newCorrelationId(): string {
  return randomUUID();
}

export function isValidCorrelationId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Headers to attach when calling another SMART service. */
export function outboundHeaders(correlationId: string): Record<string, string> {
  return { [CORRELATION_HEADER]: correlationId };
}
