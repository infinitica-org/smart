import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UniversityEventsPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    campus: {
      employerEvents: vi.fn(),
      registerForEvent: vi.fn(),
      cancelEventRegistration: vi.fn(),
    },
  },
}));

const load = vi.mocked(api.campus.employerEvents);
const register = vi.mocked(api.campus.registerForEvent);
const cancel = vi.mocked(api.campus.cancelEventRegistration);

const event = {
  id: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  institutionName: 'Uni A',
  title: 'Recruiter mixer',
  description: '',
  startsAt: '2026-10-05T09:00:00.000Z',
  endsAt: '2026-10-05T11:00:00.000Z',
  timezone: 'Asia/Kolkata',
  location: 'Hall',
  onlineUrl: null,
  capacity: 5,
  capacityLeft: 0,
  cancelled: false,
  myRegistration: null,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UniversityEventsPage />
    </QueryClientProvider>,
  );
}

describe('University events page', () => {
  beforeEach(() => {
    load.mockReset();
    register.mockReset();
    cancel.mockReset();
  });
  afterEach(cleanup);

  it('shows the empty state', async () => {
    load.mockResolvedValue({ events: [], nextCursor: null });
    renderPage();
    expect(await screen.findByText('No upcoming events')).toBeDefined();
  });

  it('offers the waitlist when an event is full, and registers', async () => {
    load.mockResolvedValue({ events: [event], nextCursor: null });
    register.mockResolvedValue({
      eventId: event.id,
      status: 'WAITLISTED',
      registeredAt: '2026-09-26T00:00:00.000Z',
      cancelledAt: null,
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Join waitlist' }));
    await waitFor(() => expect(register).toHaveBeenCalledWith(event.id));
  });

  it('shows Registered and Waitlisted with a cancel action', async () => {
    load.mockResolvedValue({
      events: [
        { ...event, myRegistration: 'REGISTERED' as const },
        { ...event, id: 'b', title: 'Second', myRegistration: 'WAITLISTED' as const },
      ],
      nextCursor: null,
    });
    cancel.mockResolvedValue({
      eventId: event.id,
      status: 'CANCELLED',
      registeredAt: '2026-09-26T00:00:00.000Z',
      cancelledAt: '2026-09-26T01:00:00.000Z',
    });
    renderPage();
    expect(await screen.findByText('Registered')).toBeDefined();
    expect(screen.getByText('Waitlisted')).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0] as HTMLElement);
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(event.id));
  });

  it('shows a clear reason when the server refuses, and an error state with retry', async () => {
    load.mockResolvedValueOnce({ events: [{ ...event, capacityLeft: 3 }], nextCursor: null });
    register.mockRejectedValue(new Error('Your company is not approved at this university.'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Register' }));
    expect(
      await screen.findByText('Your company is not approved at this university.'),
    ).toBeDefined();
  });
});
