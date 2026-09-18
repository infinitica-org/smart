import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CandidatesPage from './page';

vi.mock('../../../../lib/api', () => ({
  api: {
    assessment: { listSkillClaims: vi.fn().mockResolvedValue([]) },
    onboarding: { listTpoStudents: vi.fn().mockResolvedValue([]) },
  },
}));

describe('CandidatesPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders unified filter toolbar controls', async () => {
    render(<CandidatesPage />);

    expect(await screen.findByRole('searchbox', { name: /Search candidates/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Filter by skill category/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Filter by Skills/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /Filter by Proficiency/i })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Professional' })).toBeDefined();
    expect(screen.queryByRole('link', { name: /Onboard Candidates/i })).toBeNull();
  });
});
