import { describe, expect, it } from 'vitest';
import {
  DEFAULT_JOBS_STATE,
  activeFilters,
  clearFilters,
  parseJobsUrl,
  toJobsSearch,
  withoutFilter,
} from './jobs-url-state';

const parse = (query: string) => parseJobsUrl(new URLSearchParams(query));

describe('jobs URL state (Th6-380/381)', () => {
  it('defaults to the browse view, the All tab and no filters', () => {
    expect(parse('')).toEqual(DEFAULT_JOBS_STATE);
    expect(toJobsSearch(DEFAULT_JOBS_STATE)).toBe('');
  });

  it('round-trips every filter, the tab and the view so refresh and share keep the results', () => {
    const state = parse('view=saved&fit=STRONG&type=INTERNSHIP&mode=REMOTE&location=Pune');
    expect(state).toEqual({
      view: 'saved',
      fit: 'STRONG',
      type: 'INTERNSHIP',
      mode: 'REMOTE',
      location: 'Pune',
    });
    expect(parse(toJobsSearch(state).slice(1))).toEqual(state);
  });

  it('falls back to defaults for invalid, hand-edited values', () => {
    expect(parse('fit=STRETCH&type=WEEKEND&mode=MOON&view=x')).toEqual(DEFAULT_JOBS_STATE);
    expect(parse('location=%20%20').location).toBeUndefined();
    expect(parse(`location=${'a'.repeat(300)}`).location).toHaveLength(120);
  });

  it('lists active filters as chips, removes one, or clears them all (keeping tab and view)', () => {
    const state = parse('fit=GOOD&type=FULL_TIME&mode=HYBRID&location=Pune');
    expect(activeFilters(state).map((chip) => chip.label)).toEqual(['Full-time', 'Hybrid', 'Pune']);
    expect(withoutFilter(state, 'mode').mode).toBeUndefined();
    expect(withoutFilter(state, 'mode').type).toBe('FULL_TIME');
    const cleared = clearFilters(state);
    expect(activeFilters(cleared)).toEqual([]);
    expect(cleared.fit).toBe('GOOD');
  });

  it('writes only non-default parameters', () => {
    expect(toJobsSearch({ ...DEFAULT_JOBS_STATE, fit: 'GOOD' })).toBe('?fit=GOOD');
    expect(toJobsSearch({ ...DEFAULT_JOBS_STATE, view: 'saved' })).toBe('?view=saved');
  });
});
