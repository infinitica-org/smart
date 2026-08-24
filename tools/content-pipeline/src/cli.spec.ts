import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TRACK_DEFINITIONS, assertDomainWeightsSumToOne } from '@smart/contracts';
import { runValidate } from './validate.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const sampleDataFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'tech-fullstack-l1-sample.json',
);

describe('content pipeline', () => {
  it('accepts every published track definition', () => {
    expect(() => TRACK_DEFINITIONS.forEach(assertDomainWeightsSumToOne)).not.toThrow();
  });

  it('passes on the checked-in seed fixture', () => {
    const report = runValidate([sampleDataFile]);
    expect(report.ok).toBe(true);
    expect(report.itemCount).toBe(2);
    expect(report.messages).toHaveLength(0);
  });

  it('exits non-zero (ok: false) on a schema-invalid item', () => {
    const report = runValidate([path.join(fixturesDir, 'bad-item.json')]);
    expect(report.ok).toBe(false);
    expect(report.messages.some((m) => m.includes('correctOptionIds'))).toBe(true);
  });

  it('rejects a duplicate itemId across files', () => {
    const report = runValidate([sampleDataFile, sampleDataFile]);
    expect(report.ok).toBe(false);
    expect(report.messages.some((m) => m.includes('duplicate itemId'))).toBe(true);
  });
});
