import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TRACK_DEFINITIONS, assertDomainWeightsSumToOne } from '@smart/contracts';
import { runValidate } from './validate.js';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const financeFile = path.join(dataDir, 'mba-finance-l1.json');
const analyticsFile = path.join(dataDir, 'mba-business-analytics-l1.json');
const badItemFile = path.join(fixturesDir, 'bad-item.json');
const infSeV1File = path.join(dataDir, 'taxonomies', 'inf-se-v1.json');

describe('content pipeline', () => {
  it('accepts every published track definition', () => {
    expect(() => TRACK_DEFINITIONS.forEach(assertDomainWeightsSumToOne)).not.toThrow();
  });

  it('validates all 80 authored items across both lead tracks', () => {
    const report = runValidate([financeFile, analyticsFile]);
    expect(report.ok).toBe(true);
    expect(report.itemCount).toBe(80);
    expect(report.messages).toHaveLength(0);
  });

  it('validates MBA Finance bank: 40 items, all MCQ_SINGLE', () => {
    const report = runValidate([financeFile]);
    expect(report.ok).toBe(true);
    expect(report.itemCount).toBe(40);
  });

  it('validates MBA Business Analytics bank: 40 items', () => {
    const report = runValidate([analyticsFile]);
    expect(report.ok).toBe(true);
    expect(report.itemCount).toBe(40);
  });

  it('rejects an item with correctOptionIds referencing a non-existent option (schema violation)', () => {
    const report = runValidate([badItemFile]);
    expect(report.ok).toBe(false);
    expect(report.messages.some((m) => m.includes('correctOptionIds'))).toBe(true);
  });

  it('validates inf-se-v1.json matches contracts registry (drift guard)', () => {
    const report = runValidate([infSeV1File]);
    expect(report.ok).toBe(true);
    expect(report.messages).toHaveLength(0);
  });
});
