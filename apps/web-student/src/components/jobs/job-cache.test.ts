import type { StudentJobCard } from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import { patchCachedJob } from './job-cache';

const card = (id: string, saved = false) => ({ id, saved }) as StudentJobCard;

describe('patchCachedJob (optimistic updates)', () => {
  it('patches one job across infinite-query pages without touching others', () => {
    const data = {
      pages: [{ jobs: [card('a'), card('b')] }, { jobs: [card('c')] }],
      pageParams: [],
    };
    const next = patchCachedJob(data, 'c', (job) => ({ ...job, saved: true })) as typeof data;
    expect(next.pages[1]?.jobs[0]?.saved).toBe(true);
    expect(next.pages[0]?.jobs.every((job) => !job.saved)).toBe(true);
    expect(data.pages[1]?.jobs[0]?.saved).toBe(false); // the original is not mutated
  });

  it('removes a job when the patch returns null (hide)', () => {
    const flat = { jobs: [card('a'), card('b')] };
    expect((patchCachedJob(flat, 'a', () => null) as typeof flat).jobs.map((j) => j.id)).toEqual([
      'b',
    ]);
  });

  it('leaves anything that is not a job list alone', () => {
    const detail = { id: 'a', saved: false };
    expect(patchCachedJob(detail, 'a', () => null)).toBe(detail);
    expect(patchCachedJob(undefined, 'a', () => null)).toBeUndefined();
  });
});
