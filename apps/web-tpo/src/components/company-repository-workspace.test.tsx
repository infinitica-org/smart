import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { employersApi, openingsApi } from '../lib/api';
import { CompanyRepositoryWorkspace } from './company-repository-workspace';

vi.mock('../lib/api', () => ({
  employersApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
  openingsApi: {
    list: vi.fn(),
    uploadLogo: vi.fn(),
  },
}));

const employer = {
  employerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  institutionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Acme Technologies',
  sector: 'IT Services',
  location: 'Bengaluru',
  openingCount: 1,
  activeOpeningCount: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CompanyRepositoryWorkspace', () => {
  it('renders employers from the API with view link', async () => {
    vi.mocked(employersApi.list).mockResolvedValue({ employers: [employer] });
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });

    render(<CompanyRepositoryWorkspace />);

    expect(await screen.findByText('Acme Technologies')).toBeTruthy();
    const view = screen.getByRole('link', { name: 'View company' });
    expect(view.getAttribute('href')).toBe(`/companies/${employer.employerId}`);
  });

  it('filters companies by search', async () => {
    vi.mocked(employersApi.list).mockResolvedValue({
      employers: [
        employer,
        { ...employer, employerId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Zoho' },
      ],
    });
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });

    render(<CompanyRepositoryWorkspace />);
    await screen.findByText('Acme Technologies');

    fireEvent.change(screen.getByLabelText('Search companies'), { target: { value: 'zoho' } });
    expect(screen.queryByText('Acme Technologies')).toBeNull();
    expect(screen.getByText('Zoho')).toBeTruthy();
  });

  it('adds a company via the add panel', async () => {
    vi.mocked(employersApi.list).mockResolvedValue({ employers: [] });
    vi.mocked(openingsApi.list).mockResolvedValue({ openings: [] });
    vi.mocked(employersApi.create).mockResolvedValue(employer);

    render(<CompanyRepositoryWorkspace />);
    await screen.findByText('No companies yet');

    fireEvent.click(screen.getByRole('button', { name: '+ Add company' }));
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Acme Technologies' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }));

    await waitFor(() => {
      expect(employersApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme Technologies' }),
      );
    });
    expect(await screen.findByText('Acme Technologies')).toBeTruthy();
  });

  it('shows legacy postings without employer profile', async () => {
    vi.mocked(employersApi.list).mockResolvedValue({ employers: [] });
    vi.mocked(openingsApi.list).mockResolvedValue({
      openings: [
        {
          openingId: '11111111-1111-4111-8111-111111111111',
          institutionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          companyName: 'Legacy Corp',
          roleTitle: 'Analyst',
          domain: 'SOFTWARE_IT',
          requiredSkills: [
            {
              skillCode: 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION',
              minProficiency: 'ADVANCED',
            },
          ],
          minYearsExperience: 0,
          maxYearsExperience: 2,
          location: 'Chennai',
          employmentType: 'FULL_TIME',
          status: 'OPEN',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });

    render(<CompanyRepositoryWorkspace />);
    expect(await screen.findByText('Legacy Corp')).toBeTruthy();
    expect(screen.getByText(/no company profile yet/i)).toBeTruthy();
  });
});
