import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlacementCalendarWorkspace } from './placement-calendar-workspace';

const apiMock = vi.hoisted(() => ({
  listOpenings: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  openingsApi: { list: apiMock.listOpenings },
}));

const now = new Date();
const futureDate = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 5),
);
const upcomingDriveDate = futureDate.toISOString().slice(0, 10);

const opening = {
  openingId: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  companyName: 'Infinitica Labs',
  roleTitle: 'Backend Engineer',
  domain: 'SOFTWARE_IT',
  requiredSkills: [],
  minYearsExperience: 0,
  maxYearsExperience: 3,
  location: 'Coimbatore',
  employmentType: 'FULL_TIME',
  status: 'OPEN',
  createdAt: '2026-09-02T06:00:00.000Z',
  driveDate: upcomingDriveDate,
};

beforeEach(() => {
  apiMock.listOpenings.mockResolvedValue({ openings: [opening] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlacementCalendarWorkspace', () => {
  it('renders the current month grid and upcoming drives', async () => {
    render(<PlacementCalendarWorkspace />);

    expect(await screen.findByText('Upcoming Drives')).toBeDefined();
    // The heading renders before the mocked fetch resolves; wait for the drive itself.
    expect((await screen.findAllByText('Infinitica Labs')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Backend Engineer').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no upcoming drives', async () => {
    apiMock.listOpenings.mockResolvedValueOnce({ openings: [] });
    render(<PlacementCalendarWorkspace />);

    expect(await screen.findByText('No upcoming drives')).toBeDefined();
  });

  it('navigates between months', async () => {
    render(<PlacementCalendarWorkspace />);
    await screen.findByText('Upcoming Drives');

    const initialHeading = screen.getByRole('heading', { level: 2, name: /\d{4}/ });
    const initialMonth = initialHeading.textContent;

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    await screen.findByRole('heading', {
      level: 2,
      name: (name) => /\d{4}/.test(name) && name !== initialMonth,
    });
  });
});
