import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataRequestsCard } from './DataRequestsCard';
import { DeactivateAccountCard } from './DeactivateAccountCard';
import { MessagingPreferenceCard } from './MessagingPreferenceCard';
import { PersonalInfoCard } from './PersonalInfoCard';

const { users, signOut } = vi.hoisted(() => ({
  users: {
    getPersonalInfo: vi.fn(),
    updatePersonalInfo: vi.fn(),
    getMessagingPreference: vi.fn(),
    updateMessagingPreference: vi.fn(),
    listDataRequests: vi.fn(),
    createDataRequest: vi.fn(),
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
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      graduationYear: 2027,
    });
  });

  it('loads the current details and saves an edit', async () => {
    users.updatePersonalInfo.mockResolvedValue({
      fullName: 'Ada L',
      email: 'ada@example.com',
      graduationYear: 2027,
    });
    renderWithClient(<PersonalInfoCard />);

    const name = await screen.findByDisplayValue('Ada Lovelace');
    fireEvent.change(name, { target: { value: 'Ada L' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(users.updatePersonalInfo).toHaveBeenCalledWith({
        fullName: 'Ada L',
        graduationYear: 2027,
      }),
    );
    expect(await screen.findByText('Saved.')).toBeTruthy();
  });

  it('shows field guidance and does not submit invalid input', async () => {
    renderWithClient(<PersonalInfoCard />);
    fireEvent.change(await screen.findByDisplayValue('Ada Lovelace'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 2 characters/i);
    expect(users.updatePersonalInfo).not.toHaveBeenCalled();
  });

  it('keeps the input and lets the user retry after a failure', async () => {
    users.updatePersonalInfo.mockRejectedValueOnce(new Error('network'));
    users.updatePersonalInfo.mockResolvedValueOnce({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      graduationYear: 2027,
    });
    renderWithClient(<PersonalInfoCard />);
    await screen.findByDisplayValue('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not save/i);
    expect(screen.getByDisplayValue('Ada Lovelace')).toBeTruthy();

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
