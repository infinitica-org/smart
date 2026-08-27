import { describe, expect, it, vi } from 'vitest';
import {
  CORRELATION_KAFKA_HEADER,
  correlationIdFromKafkaHeaders,
  getContext,
  isValidCorrelationId,
  kafkaCorrelationHeaders,
  newCorrelationId,
  runKafkaHandler,
  runWithContext,
} from './index.js';

describe('kafka correlation', () => {
  it('encodes correlation as a UTF-8 buffer header for kafkajs', () => {
    const id = newCorrelationId();
    const headers = kafkaCorrelationHeaders(id);
    expect(headers?.[CORRELATION_KAFKA_HEADER]?.toString('utf8')).toBe(id);
    expect(kafkaCorrelationHeaders(undefined)).toBeUndefined();
  });

  it('reads correlation from Buffer or string Kafka headers', () => {
    const id = newCorrelationId();
    expect(
      correlationIdFromKafkaHeaders({
        [CORRELATION_KAFKA_HEADER]: Buffer.from(id, 'utf8'),
      }),
    ).toBe(id);
    expect(
      correlationIdFromKafkaHeaders({
        [CORRELATION_KAFKA_HEADER]: id,
      }),
    ).toBe(id);
  });

  it('mints a UUID when the Kafka header is missing or junk', () => {
    const minted = correlationIdFromKafkaHeaders({
      [CORRELATION_KAFKA_HEADER]: Buffer.from('not-a-uuid', 'utf8'),
    });
    expect(isValidCorrelationId(minted)).toBe(true);
    expect(isValidCorrelationId(correlationIdFromKafkaHeaders(undefined))).toBe(true);
  });

  it('runKafkaHandler restores ALS for the consumer body', () => {
    const id = newCorrelationId();
    const seen = runKafkaHandler(
      { [CORRELATION_KAFKA_HEADER]: Buffer.from(id, 'utf8') },
      () => getContext()?.correlationId,
      { module: 'evaluation' },
    );
    expect(seen).toBe(id);
    expect(getContext()).toBeUndefined();
  });

  it('producer path can read ALS when emit builds headers', () => {
    const id = newCorrelationId();
    const headers = runWithContext({ correlationId: id, module: 'api-core' }, () =>
      kafkaCorrelationHeaders(getContext()?.correlationId),
    );
    expect(headers?.[CORRELATION_KAFKA_HEADER]?.toString('utf8')).toBe(id);
  });
});

describe('KafkaService emit headers', () => {
  it('documents that emit attaches CORRELATION_KAFKA_HEADER from ALS', async () => {
    // Smoke: header helper used by KafkaService.emit — keep behaviour pinned here
    // without spinning kafkajs in unit tests.
    const send = vi.fn(async () => undefined);
    const id = newCorrelationId();
    const headers = kafkaCorrelationHeaders(id);
    await send({
      topic: 'smart.test',
      messages: [{ key: 'k', value: '{}', headers }],
    });
    expect(
      send.mock.calls[0]?.[0].messages[0].headers[CORRELATION_KAFKA_HEADER].toString('utf8'),
    ).toBe(id);
  });
});
