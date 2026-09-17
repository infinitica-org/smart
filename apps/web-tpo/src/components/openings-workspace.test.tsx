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

describe('Listed openings workspace', () => {
  it('does not embed the create wizard', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });
    render(<OpeningsWorkspace />);
    await screen.findByText(/No job openings yet/);
    expect(screen.queryByLabelText('Company name')).toBeNull();
  });

  it('links to the create job posting route', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });
    render(<OpeningsWorkspace />);
    const link = await screen.findByRole('link', { name: 'Create Job Posting' });
    expect(link.getAttribute('href')).toBe('/openings/create');
  });

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
  });

  it('applies status filter and requests filtered openings from API', async () => {
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [opening] });
    render(<OpeningsWorkspace />);
    expect(await screen.findByText('Backend Engineer')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Filter openings by status'), {
      target: { value: 'OPEN' },
    });

    await waitFor(() => expect(openingsApi.list).toHaveBeenCalledWith({ status: 'OPEN' }));
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

    fireEvent.change(screen.getByLabelText('Search openings'), { target: { value: 'Acme' } });

    expect(screen.queryByText('Backend Engineer')).toBeNull();
    expect(screen.getByText('Frontend Developer')).toBeDefined();
  });
});
