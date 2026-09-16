import type * as SmartContracts from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openingsApi } from '../lib/api';
import { OpeningsWorkspace } from './openings-workspace';

vi.mock('@smart/contracts', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof SmartContracts;
  const testSkill = actual.SKILL_DEFINITIONS.find(
    (skill) => skill.code === 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
  );
  if (!testSkill) {
    throw new Error(
      'Expected ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION in SKILL_DEFINITIONS for CO-T01 tests',
    );
  }
  return {
    ...actual,
    SKILL_DEFINITIONS: [testSkill],
  };
});

vi.mock('../lib/api', () => ({
  openingsApi: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
  },
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
  headcount: 3,
  status: 'DRAFT' as const,
  createdAt: '2026-09-02T05:30:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderEmpty() {
  vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });
  render(<OpeningsWorkspace />);
}

function goToStep(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
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
  goToStep('Job Details');
  fireEvent.change(screen.getByLabelText('Category (optional)'), {
    target: { value: 'SOFTWARE_ARCHITECTURE_SYSTEM_DESIGN' },
  });
  goToStep('Eligibility');
  fireEvent.change(screen.getByLabelText('Maximum years experience'), {
    target: { value: '5' },
  });
  goToStep('Requirements');
  fireEvent.click(
    await screen.findByRole('checkbox', {
      name: /Algorithmic Complexity & Performance Optimization/,
    }),
  );
}

function submitForm() {
  const form = screen.getByRole('button', { name: 'Create opening' }).closest('form');
  if (!form) throw new Error('Expected opening form');
  fireEvent.submit(form);
}

describe('CO-T01 TPO opening workspace', () => {
  it('shows loading and empty states', async () => {
    let resolveList: (value: { openings: [] }) => void = () => undefined;
    vi.mocked(openingsApi.list).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );

    render(<OpeningsWorkspace />);

    expect(screen.getByRole('status').textContent).toContain('Loading openings');
    resolveList({ openings: [] });
    expect(await screen.findByText(/No job openings yet/)).toBeDefined();
  });

  it('renders opening details from the list API', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [opening] });
    render(<OpeningsWorkspace />);

    expect(await screen.findByText('Backend Engineer')).toBeDefined();
    expect(screen.getByText('Infinitica Labs')).toBeDefined();
    expect(screen.getByText('2–5 years')).toBeDefined();
    expect(screen.getByText('Coimbatore')).toBeDefined();
    expect(screen.getAllByText('Full Time')).toHaveLength(2);
    expect(screen.getAllByText('Draft').length).toBeGreaterThanOrEqual(1);
  });

  it('shows a safe list error and allows refresh', async () => {
    vi.mocked(openingsApi.list)
      .mockRejectedValueOnce(new Error('Placement API unavailable'))
      .mockResolvedValueOnce({ openings: [] });
    render(<OpeningsWorkspace />);

    expect(await screen.findByText('Placement API unavailable')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText(/No job openings yet/)).toBeDefined();
    expect(openingsApi.list).toHaveBeenCalledTimes(2);
  });

  it('keeps create disabled until a taxonomy skill is selected', async () => {
    renderEmpty();
    await screen.findByText(/No job openings yet/);
    expect(screen.getByRole('button', { name: 'Create opening' })).toHaveProperty('disabled', true);
    goToStep('Requirements');
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Algorithmic Complexity & Performance Optimization/ }),
    );
    expect(screen.getByRole('button', { name: 'Create opening' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(
      screen.getByLabelText(
        'Minimum proficiency for Algorithmic Complexity & Performance Optimization',
      ),
    ).toBeDefined();
  });

  it('disables submit while the create request is in flight', async () => {
    let resolveCreate: (value: typeof opening) => void = () => undefined;
    vi.mocked(openingsApi.create).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderEmpty();
    await fillValidForm();
    submitForm();

    expect(await screen.findByRole('button', { name: 'Create opening' })).toHaveProperty(
      'disabled',
      true,
    );
    resolveCreate(opening);
    expect(await screen.findByText('Job opening created in Draft status.')).toBeDefined();
  }, 15_000);

  it('validates experience range and headcount with the shared contract', async () => {
    renderEmpty();
    await fillValidForm();
    goToStep('Eligibility');
    fireEvent.change(screen.getByLabelText('Minimum years experience'), {
      target: { value: '6' },
    });
    fireEvent.change(screen.getByLabelText('Maximum years experience'), {
      target: { value: '2' },
    });
    submitForm();

    expect(await screen.findByText(/greater than or equal/)).toBeDefined();
    expect(openingsApi.create).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Minimum years experience'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Maximum years experience'), {
      target: { value: '2' },
    });
    goToStep('Job Details');
    fireEvent.change(screen.getByLabelText('Headcount'), { target: { value: '0' } });
    submitForm();
    expect(await screen.findByText(/expected number to be >=1/)).toBeDefined();
    expect(openingsApi.create).not.toHaveBeenCalled();
  }, 15_000);

  it('submits a taxonomy skill with chosen proficiency and refreshes the list', async () => {
    vi.mocked(openingsApi.list)
      .mockResolvedValueOnce({ openings: [] })
      .mockResolvedValueOnce({ openings: [opening] });
    vi.mocked(openingsApi.create).mockResolvedValue(opening);
    render(<OpeningsWorkspace />);
    await fillValidForm();

    const proficiency = screen.getByLabelText(
      'Minimum proficiency for Algorithmic Complexity & Performance Optimization',
    );
    fireEvent.change(proficiency, { target: { value: 'ADVANCED' } });
    submitForm();

    await waitFor(() =>
      expect(openingsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Infinitica Labs',
          roleTitle: 'Backend Engineer',
          requiredSkills: [
            {
              skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
              minProficiency: 'ADVANCED',
            },
          ],
        }),
      ),
    );
    const submitted = vi.mocked(openingsApi.create).mock.calls[0]?.[0];
    expect(submitted).not.toHaveProperty('institutionId');
    expect(await screen.findByText('Job opening created in Draft status.')).toBeDefined();
    expect(await screen.findByText('Backend Engineer')).toBeDefined();
    expect(openingsApi.list).toHaveBeenCalledTimes(2);
  });

  it('shows API creation errors without clearing the form', async () => {
    vi.mocked(openingsApi.create).mockRejectedValue(new Error('Taxonomy is not seeded'));
    renderEmpty();
    await fillValidForm();
    submitForm();

    expect(await screen.findByText('Taxonomy is not seeded')).toBeDefined();
    goToStep('Company & Role');
    expect((screen.getByLabelText('Company name') as HTMLInputElement).value).toBe(
      'Infinitica Labs',
    );
  });

  describe('AC-T03 JD Inbox functionality', () => {
    it('applies status filter and requests filtered openings from API', async () => {
      vi.mocked(openingsApi.list).mockResolvedValue({ openings: [opening] });
      render(<OpeningsWorkspace />);

      expect(await screen.findByText('Backend Engineer')).toBeDefined();

      const statusSelect = screen.getByLabelText('Filter openings by status');
      fireEvent.change(statusSelect, { target: { value: 'OPEN' } });

      await waitFor(() => expect(openingsApi.list).toHaveBeenCalledWith({ status: 'OPEN' }));
    });

    it('inspects opening details via openingsApi.get when Inspect JD is clicked', async () => {
      vi.mocked(openingsApi.list).mockResolvedValue({ openings: [opening] });
      vi.mocked(openingsApi.get).mockResolvedValue(opening);

      render(<OpeningsWorkspace />);
      expect(await screen.findByText('Backend Engineer')).toBeDefined();

      const inspectButton = screen.getByRole('button', { name: 'Inspect JD' });
      fireEvent.click(inspectButton);

      expect(openingsApi.get).toHaveBeenCalledWith(opening.openingId);

      expect(await screen.findByText('Required Taxonomy Skills')).toBeDefined();
      expect(
        screen.getAllByText('Algorithmic Complexity & Performance Optimization').length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Close inspection' }));
      expect(screen.queryByText('Required Taxonomy Skills')).toBeNull();
    });

    it('keeps form values when moving between posting steps', async () => {
      renderEmpty();
      await screen.findByLabelText('Company name');
      fireEvent.change(screen.getByLabelText('Company name'), {
        target: { value: 'Infinitica Labs' },
      });
      goToStep('About Company');
      expect(screen.getByText(/Not saved/)).toBeDefined();
      goToStep('Company & Role');
      expect((screen.getByLabelText('Company name') as HTMLInputElement).value).toBe(
        'Infinitica Labs',
      );
    });

    it('updates the live preview from supported fields only', async () => {
      renderEmpty();
      await screen.findByLabelText('Company name');
      fireEvent.change(screen.getByLabelText('Company name'), {
        target: { value: 'Infinitica Labs' },
      });
      fireEvent.change(screen.getByLabelText('Role title'), {
        target: { value: 'Backend Engineer' },
      });
      expect(screen.getByRole('complementary', { name: 'Live job preview' }).textContent).toContain(
        'Infinitica Labs',
      );
      expect(screen.getByRole('complementary', { name: 'Live job preview' }).textContent).toContain(
        'Backend Engineer',
      );
      expect(screen.getByText(/will not appear here/)).toBeDefined();
    });

    it('moves between steps with Previous and Save & Continue', async () => {
      renderEmpty();
      await screen.findByText('Step 1 of 8');
      expect(screen.getByLabelText('Company name')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
      expect(screen.getByText('Step 2 of 8')).toBeDefined();
      expect(screen.getByText('About Company')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(screen.getByText('Step 1 of 8')).toBeDefined();
      expect(screen.getByLabelText('Company name')).toBeDefined();
    });

    it('shows the review step from current form state', async () => {
      renderEmpty();
      await fillValidForm();
      goToStep('Review & Publish');
      expect(screen.getByText('Review & Publish')).toBeDefined();
      expect(screen.getAllByText('Infinitica Labs').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Backend Engineer').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Algorithmic Complexity/).length).toBeGreaterThanOrEqual(1);
    });

    it('does not collect unsupported company, hiring, or drive fields', async () => {
      renderEmpty();
      await screen.findByLabelText('Company name');
      goToStep('About Company');
      expect(screen.getByText(/Not saved/)).toBeDefined();
      expect(screen.queryByLabelText('About the Company')).toBeNull();
      expect(screen.queryByLabelText('Salary Details')).toBeNull();
      goToStep('Hiring Process');
      expect(screen.queryByLabelText('Drive SPOC')).toBeNull();
      goToStep('Drive Details');
      expect(screen.queryByLabelText('Drive Date')).toBeNull();
      expect(screen.queryByLabelText('Last Date to Apply')).toBeNull();
    });

    it('filters visible openings by search query', async () => {
      const otherOpening = {
        ...opening,
        openingId: '33333333-3333-4333-8333-333333333333',
        roleTitle: 'Frontend Developer',
        companyName: 'Acme Corp',
      };
      vi.mocked(openingsApi.list).mockResolvedValue({ openings: [opening, otherOpening] });

      render(<OpeningsWorkspace />);
      expect(await screen.findByText('Backend Engineer')).toBeDefined();
      expect(screen.getByText('Frontend Developer')).toBeDefined();

      const searchInput = screen.getByLabelText('Search openings');
      fireEvent.change(searchInput, { target: { value: 'Acme' } });

      expect(screen.queryByText('Backend Engineer')).toBeNull();
      expect(screen.getByText('Frontend Developer')).toBeDefined();
    });
  });
});
