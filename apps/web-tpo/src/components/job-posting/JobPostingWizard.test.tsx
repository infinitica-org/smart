import type * as SmartContracts from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openingsApi } from '../../lib/api';
import { JobPostingWizard } from './JobPostingWizard';

vi.mock('@smart/contracts', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof SmartContracts;
  const testSkill = actual.SKILL_DEFINITIONS.find(
    (skill) => skill.code === 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
  );
  if (!testSkill) throw new Error('Expected test skill in SKILL_DEFINITIONS');
  return { ...actual, SKILL_DEFINITIONS: [testSkill] };
});

vi.mock('../../lib/api', () => ({
  openingsApi: { create: vi.fn(), uploadDocument: vi.fn(), uploadLogo: vi.fn() },
}));

const opening = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT' as const,
  requiredSkills: [
    {
      skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
      minProficiency: 'ADVANCED' as const,
    },
  ],
  minYearsExperience: 2,
  maxYearsExperience: 5,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME' as const,
  headcount: 1,
  status: 'DRAFT' as const,
  createdAt: '2026-09-02T05:30:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

function goToStep(label: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Go to step.*${label}`, 'i') }));
}

async function fillValidForm() {
  await screen.findByLabelText('Company name');
  fireEvent.change(screen.getByLabelText('Company name'), {
    target: { value: 'Infinitica Labs' },
  });
  fireEvent.change(screen.getByLabelText('Role title'), {
    target: { value: 'Backend Engineer' },
  });
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Coimbatore' } });
  goToStep('Requirements');
  fireEvent.change(screen.getByLabelText('Add required skill'), {
    target: { value: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
}

describe('JobPostingWizard', () => {
  it('shows company logo upload on step 1 instead of category', async () => {
    render(<JobPostingWizard onCreated={async () => {}} />);
    await screen.findByRole('button', { name: 'Upload logo' });
    expect(screen.queryByLabelText('Category')).toBeNull();
    expect(screen.getByLabelText('Job domain')).toBeDefined();
  });

  it('collects about-company fields on step 2', async () => {
    render(<JobPostingWizard onCreated={async () => {}} />);
    goToStep('About the Company');
    expect(screen.getByLabelText('About the Company')).toBeDefined();
    expect(screen.getByLabelText('What the Company Offers')).toBeDefined();
    expect(screen.getByLabelText('Additional Company Details')).toBeDefined();
  });

  it('offers document upload on role details without headcount', async () => {
    render(<JobPostingWizard onCreated={async () => {}} />);
    goToStep('Role Details');
    expect(screen.getByRole('button', { name: 'Upload document' })).toBeDefined();
    expect(screen.queryByLabelText('Headcount')).toBeNull();
  });

  it('uses dropdown skill picker with scrollable list area', async () => {
    render(<JobPostingWizard onCreated={async () => {}} />);
    goToStep('Requirements');
    expect(screen.getByLabelText('Add required skill')).toBeDefined();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(document.querySelector('.max-h-96.overflow-y-auto')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save & Continue' })).toBeDefined();
  });

  it('posts job from review with extended payload fields', async () => {
    vi.mocked(openingsApi.create).mockResolvedValue(opening);
    render(<JobPostingWizard onCreated={async () => {}} />);
    await fillValidForm();
    goToStep('About the Company');
    fireEvent.change(screen.getByLabelText('About the Company'), {
      target: { value: 'About copy' },
    });
    goToStep('Review & Post');
    fireEvent.click(screen.getByRole('button', { name: /Post Job/ }));

    await waitFor(() =>
      expect(openingsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          aboutCompany: 'About copy',
        }),
      ),
    );
  });

  it('shows Post Job at the bottom on review step', async () => {
    render(<JobPostingWizard onCreated={async () => {}} />);
    await fillValidForm();
    goToStep('Review & Post');
    expect(screen.getByRole('button', { name: /Post Job/ })).toBeDefined();
  });
});
