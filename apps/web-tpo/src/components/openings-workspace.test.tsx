import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openingsApi } from '../lib/api';
import { OpeningsWorkspace } from './openings-workspace';

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
      skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
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

async function fillValidForm() {
  await screen.findByText(/No job openings yet/);
  fireEvent.change(screen.getByLabelText('Company name'), {
    target: { value: 'Infinitica Labs' },
  });
  fireEvent.change(screen.getByLabelText('Role title'), {
    target: { value: 'Backend Engineer' },
  });
  fireEvent.change(screen.getByLabelText('Maximum years experience'), {
    target: { value: '5' },
  });
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Coimbatore' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Programming fundamentals & logic/ }));
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
    fireEvent.click(screen.getByRole('checkbox', { name: /Programming fundamentals & logic/ }));
    expect(screen.getByRole('button', { name: 'Create opening' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(
      screen.getByLabelText('Minimum proficiency for Programming fundamentals & logic'),
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
  });

  it('validates experience range and headcount with the shared contract', async () => {
    renderEmpty();
    await fillValidForm();
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
    fireEvent.change(screen.getByLabelText('Headcount'), { target: { value: '0' } });
    submitForm();
    expect(await screen.findByText(/expected number to be >=1/)).toBeDefined();
    expect(openingsApi.create).not.toHaveBeenCalled();
  });

  it('submits a taxonomy skill with chosen proficiency and refreshes the list', async () => {
    vi.mocked(openingsApi.list)
      .mockResolvedValueOnce({ openings: [] })
      .mockResolvedValueOnce({ openings: [opening] });
    vi.mocked(openingsApi.create).mockResolvedValue(opening);
    render(<OpeningsWorkspace />);
    await fillValidForm();

    const proficiency = screen.getByLabelText(
      'Minimum proficiency for Programming fundamentals & logic',
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
              skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
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
      expect(screen.getAllByText('Programming fundamentals & logic').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.getByText('PROGRAMMING_FUNDAMENTALS_LOGIC')).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: 'Close inspection' }));
      expect(screen.queryByText('Required Taxonomy Skills')).toBeNull();
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
