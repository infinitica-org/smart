import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataRequestsCard } from './DataRequestsCard';
import { DeactivateAccountCard } from './DeactivateAccountCard';
import { DiscoverabilityCard } from './DiscoverabilityCard';
import { MessagingPreferenceCard } from './MessagingPreferenceCard';
import { PersonalInfoCard } from './PersonalInfoCard';

const { users, signOut } = vi.hoisted(() => ({
  users: {
    getPersonalInfo: vi.fn(),
    updatePersonalInfo: vi.fn(),
    getMessagingPreference: vi.fn(),
    updateMessagingPreference: vi.fn(),
    getDiscoverability: vi.fn(),
    updateDiscoverability: vi.fn(),
    listDataRequests: vi.fn(),
    createDataRequest: vi.fn(),
    downloadDataExport: vi.fn(),
    deactivateAccount: vi.fn(),
  },
  signOut: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: { users } }));
vi.mock('@/lib/auth', () => ({ signOut: () => signOut() }));

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  Object.values(users).forEach((fn) => fn.mockReset());
  signOut.mockReset().mockResolvedValue(undefined);
});

describe('PersonalInfoCard', () => {
  beforeEach(() => {
    users.getPersonalInfo.mockResolvedValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      gender: 'Female',
      dateOfBirth: '2003-12-10',
      phone: '+91 9876543210',
      graduationYear: 2027,
    });
  });

  const savedInfo = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    gender: 'Female',
    dateOfBirth: '2003-12-10',
    phone: '+91 9876543210',
    graduationYear: 2027,
  };

  it('loads every current detail and shows the phone as read-only', async () => {
    renderWithClient(<PersonalInfoCard />);

    expect(await screen.findByDisplayValue('Ada')).toBeTruthy();
    expect(screen.getByDisplayValue('Lovelace')).toBeTruthy();
    expect(screen.getByDisplayValue('Female')).toBeTruthy();
    expect(screen.getByDisplayValue('2003-12-10')).toBeTruthy();
    const phone = screen.getByDisplayValue('+91 9876543210') as HTMLInputElement;
    expect(phone.disabled).toBe(true);
  });

  it('saves an edit with the new fields', async () => {
    users.updatePersonalInfo.mockResolvedValue({ ...savedInfo, firstName: 'Augusta' });
    renderWithClient(<PersonalInfoCard />);

    fireEvent.change(await screen.findByDisplayValue('Ada'), { target: { value: 'Augusta' } });
    fireEvent.change(screen.getByDisplayValue('2003-12-10'), { target: { value: '2003-12-11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(users.updatePersonalInfo).toHaveBeenCalledWith({
        firstName: 'Augusta',
        lastName: 'Lovelace',
        gender: 'Female',
        dateOfBirth: '2003-12-11',
        graduationYear: 2027,
      }),
    );
    expect(await screen.findByText('Saved.')).toBeTruthy();
  });

  it('shows field guidance and does not submit invalid input', async () => {
    renderWithClient(<PersonalInfoCard />);
    fireEvent.change(await screen.findByDisplayValue('Ada'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/first name is required/i);
    expect(users.updatePersonalInfo).not.toHaveBeenCalled();
  });

  it('rejects a birth date in the future', async () => {
    renderWithClient(<PersonalInfoCard />);
    fireEvent.change(await screen.findByDisplayValue('2003-12-10'), {
      target: { value: '2999-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/cannot be in the future/i);
    expect(users.updatePersonalInfo).not.toHaveBeenCalled();
  });

  it('keeps the input and lets the user retry after a failure', async () => {
    users.updatePersonalInfo.mockRejectedValueOnce(new Error('network'));
    users.updatePersonalInfo.mockResolvedValueOnce(savedInfo);
    renderWithClient(<PersonalInfoCard />);
    await screen.findByDisplayValue('Ada');

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not save/i);
    expect(screen.getByDisplayValue('Ada')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Saved.')).toBeTruthy();
  });
});

describe('MessagingPreferenceCard', () => {
  it('toggles employer messaging off', async () => {
    users.getMessagingPreference.mockResolvedValue({ allowEmployerMessages: true });
    users.updateMessagingPreference.mockResolvedValue({ allowEmployerMessages: false });
    renderWithClient(<MessagingPreferenceCard />);

    const toggle = await screen.findByRole('switch', { name: /message me/i });
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(users.updateMessagingPreference).toHaveBeenCalledWith({
        allowEmployerMessages: false,
      }),
    );
  });
});

describe('DiscoverabilityCard (S6-VV-113)', () => {
  it('opts out of employer discovery', async () => {
    users.getDiscoverability.mockResolvedValue({ discoverableToEmployers: true });
    users.updateDiscoverability.mockResolvedValue({ discoverableToEmployers: false });
    renderWithClient(<DiscoverabilityCard />);

    const toggle = await screen.findByRole('switch', { name: /let employers find me/i });
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    expect(screen.getByText(/placement cell always sees you/i)).toBeTruthy();
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(users.updateDiscoverability).toHaveBeenCalledWith({ discoverableToEmployers: false }),
    );
  });
});

describe('DataRequestsCard', () => {
  it('shows an empty state when there are no requests', async () => {
    users.listDataRequests.mockResolvedValue({ requests: [] });
    renderWithClient(<DataRequestsCard />);
    expect(await screen.findByText('You have not made any requests.')).toBeTruthy();
  });

  it('rejects details that are too short without calling the API', async () => {
    users.listDataRequests.mockResolvedValue({ requests: [] });
    renderWithClient(<DataRequestsCard />);
    await screen.findByText('You have not made any requests.');

    fireEvent.change(screen.getByLabelText('Details'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 10 characters/i);
    expect(users.createDataRequest).not.toHaveBeenCalled();
  });

  it('submits a request and lists it', async () => {
    users.listDataRequests.mockResolvedValueOnce({ requests: [] });
    users.createDataRequest.mockResolvedValue({ id: 'r1' });
    users.listDataRequests.mockResolvedValue({
      requests: [
        {
          id: 'r1',
          type: 'CORRECTION',
          status: 'OPEN',
          details: 'Fix my graduation year.',
          createdAt: '2026-09-24T00:00:00.000Z',
          resolvedAt: null,
        },
      ],
    });
    renderWithClient(<DataRequestsCard />);
    await screen.findByText('You have not made any requests.');

    fireEvent.change(screen.getByLabelText('Details'), {
      target: { value: 'Fix my graduation year.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() =>
      expect(users.createDataRequest).toHaveBeenCalledWith({
        type: 'CORRECTION',
        details: 'Fix my graduation year.',
      }),
    );
    expect(await screen.findByText('Request submitted.')).toBeTruthy();
    expect(await screen.findByText('OPEN')).toBeTruthy();
  });

  it('requests an export without details and downloads a finished one (S6-VV-115)', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    users.createDataRequest.mockResolvedValue({ id: 'x1' });
    users.listDataRequests.mockResolvedValue({
      requests: [
        {
          id: 'x0',
          type: 'EXPORT',
          status: 'COMPLETED',
          details: '',
          createdAt: '2026-09-24T00:00:00.000Z',
          resolvedAt: '2026-09-24T00:01:00.000Z',
          exportAvailableUntil: '2026-10-01T00:01:00.000Z',
        },
      ],
    });
    users.downloadDataExport.mockResolvedValue({
      bundleUrl: 'https://signed/bundle.json',
      files: [{ objectKey: 'evidence/u/cv.pdf', url: 'https://signed/cv.pdf' }],
      linksExpireInSeconds: 900,
    });
    renderWithClient(<DataRequestsCard />);

    fireEvent.change(await screen.findByLabelText('Request type'), {
      target: { value: 'EXPORT' },
    });
    expect(screen.queryByLabelText('Details')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() =>
      expect(users.createDataRequest).toHaveBeenCalledWith({ type: 'EXPORT', details: '' }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith('https://signed/bundle.json', '_blank', 'noopener'),
    );
    expect(await screen.findByRole('link', { name: 'cv.pdf' })).toBeTruthy();
  });
});

describe('DeactivateAccountCard', () => {
  it('requires typing DEACTIVATE before the confirm button is enabled', () => {
    renderWithClient(<DeactivateAccountCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate my account' }));

    const confirm = screen.getByRole('button', { name: 'Confirm deactivation' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Type DEACTIVATE/i), {
      target: { value: 'DEACTIVATE' },
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
  });

  it('deactivates, then signs the user out', async () => {
    users.deactivateAccount.mockResolvedValue({ deactivatedAt: '2026-09-24T00:00:00.000Z' });
    renderWithClient(<DeactivateAccountCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate my account' }));
    fireEvent.change(screen.getByLabelText(/Type DEACTIVATE/i), {
      target: { value: 'DEACTIVATE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deactivation' }));

    await waitFor(() =>
      expect(users.deactivateAccount).toHaveBeenCalledWith({ confirmation: 'DEACTIVATE' }),
    );
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it('stays signed in and shows an error if deactivation fails', async () => {
    users.deactivateAccount.mockRejectedValue(new Error('boom'));
    renderWithClient(<DeactivateAccountCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate my account' }));
    fireEvent.change(screen.getByLabelText(/Type DEACTIVATE/i), {
      target: { value: 'DEACTIVATE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deactivation' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/could not deactivate/i);
    expect(signOut).not.toHaveBeenCalled();
  });
});
