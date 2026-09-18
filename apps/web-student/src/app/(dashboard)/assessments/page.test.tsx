import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}));

import LegacyAssessmentsPage from './page';

describe('LegacyAssessmentsPage', () => {
  it('redirects to the assessment hub', () => {
    LegacyAssessmentsPage();
    expect(redirect).toHaveBeenCalledWith('/assessment');
  });
});
