import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentReadinessRoster } from './StudentReadinessRoster';
import { universityApi } from '../../lib/api';

const replace = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/students/readiness',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('../../lib/api', () => ({
  universityApi: { roster: vi.fn(), messageStudent: vi.fn() },
}));

const row = {
  userId: '11111111-1111-4111-8111-111111111111',
  fullName: 'Asha Rao',
  email: 'asha@uni.edu',
  program: 'B.Tech CSE',
  graduationYear: 2026,
  verificationStatus: 'IN_PROGRESS' as const,
  verifiedSkillCount: 0,
  declaredSkillCount: 2,
  needsAssistance: true,
};

describe('StudentReadinessRoster', () => {
  beforeEach(() => {
    search = '';
    replace.mockReset();
    vi.mocked(universityApi.roster).mockReset();
    vi.mocked(universityApi.roster).mockResolvedValue({ items: [row], nextCursor: null });
  });
  afterEach(cleanup);

  it('lists students with verification status and the needs-assistance flag', async () => {
    render(<StudentReadinessRoster />);
    expect(await screen.findByText('Asha Rao')).toBeDefined();
    expect(within(screen.getByRole('table')).getByText('In progress')).toBeDefined();
    expect(screen.getByText('Needs assistance')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Asha Rao' }).getAttribute('href')).toBe(
      `/students/readiness/${row.userId}`,
    );
  });

  it('reads filters from the URL and sends them to the API', async () => {
    search = 'verificationStatus=VERIFIED&program=CSE&gradYear=2026';
    render(<StudentReadinessRoster />);
    await waitFor(() =>
      expect(universityApi.roster).toHaveBeenCalledWith(
        expect.objectContaining({ verificationStatus: 'VERIFIED', program: 'CSE', gradYear: 2026 }),
      ),
    );
    expect(screen.getByText('Status: Verified')).toBeDefined();
  });

  it('writes a changed filter back to the URL, and clears everything', () => {
    search = 'program=CSE';
    render(<StudentReadinessRoster />);
    fireEvent.change(screen.getByLabelText(/Verification status/i), {
      target: { value: 'VERIFIED' },
    });
    expect(replace).toHaveBeenCalledWith(
      '/students/readiness?program=CSE&verificationStatus=VERIFIED',
    );
    fireEvent.click(screen.getByRole('button', { name: /Clear all/i }));
    expect(replace).toHaveBeenLastCalledWith('/students/readiness');
  });

  it('ignores an unknown status in the URL', async () => {
    search = 'verificationStatus=BOGUS';
    render(<StudentReadinessRoster />);
    await waitFor(() => expect(universityApi.roster).toHaveBeenCalled());
    expect(vi.mocked(universityApi.roster).mock.calls[0]?.[0].verificationStatus).toBeUndefined();
  });

  it('shows an empty state, with a hint when filters are active', async () => {
    vi.mocked(universityApi.roster).mockResolvedValue({ items: [], nextCursor: null });
    render(<StudentReadinessRoster />);
    expect(await screen.findByText('No students yet')).toBeDefined();
    cleanup();
    search = 'program=Law';
    render(<StudentReadinessRoster />);
    expect(await screen.findByText('No students match these filters')).toBeDefined();
  });

  it('shows a recoverable error and retries', async () => {
    vi.mocked(universityApi.roster).mockRejectedValueOnce(new Error('boom'));
    render(<StudentReadinessRoster />);
    expect(await screen.findByText('boom')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByText('Asha Rao')).toBeDefined();
  });

  it('loads the next page with the server cursor', async () => {
    vi.mocked(universityApi.roster)
      .mockResolvedValueOnce({ items: [row], nextCursor: row.userId })
      .mockResolvedValueOnce({
        items: [{ ...row, userId: '22222222-2222-4222-8222-222222222222', fullName: 'Ben Iyer' }],
        nextCursor: null,
      });
    render(<StudentReadinessRoster />);
    fireEvent.click(await screen.findByRole('button', { name: /Load more/i }));
    expect(await screen.findByText('Ben Iyer')).toBeDefined();
    expect(vi.mocked(universityApi.roster).mock.calls[1]?.[0].cursor).toBe(row.userId);
    expect(screen.getByText('Asha Rao')).toBeDefined();
  });
});
