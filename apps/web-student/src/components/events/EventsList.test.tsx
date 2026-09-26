import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsList } from './EventsList';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    campus: { listEvents: vi.fn(), registerForEvent: vi.fn(), cancelEventRegistration: vi.fn() },
  },
}));

const list = vi.mocked(api.campus.listEvents);
const register = vi.mocked(api.campus.registerForEvent);

const event = {
  id: '11111111-1111-4111-8111-111111111111',
  institutionId: '22222222-2222-4222-8222-222222222222',
  institutionName: 'Uni A',
  title: 'Campus drive',
  description: '',
  startsAt: '2026-10-05T09:00:00.000Z',
  endsAt: '2026-10-05T11:00:00.000Z',
  timezone: 'Asia/Kolkata',
  location: 'Main hall',
  onlineUrl: null,
  capacity: 10,
  capacityLeft: 4,
  cancelled: false,
  myRegistration: null,
};

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventsList />
    </QueryClientProvider>,
  );
}

describe('EventsList', () => {
  beforeEach(() => {
    list.mockReset();
    register.mockReset();
    list.mockResolvedValue({ events: [event], nextCursor: null });
  });
  afterEach(cleanup);

  it('shows the event in its own timezone with seats left and a Register button', async () => {
    renderList();
    expect(await screen.findByText('Campus drive')).toBeDefined();
    expect(screen.getByText(/2:30/)).toBeDefined();
    expect(screen.getByText('4 seats left')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Register' })).toBeDefined();
  });

  it('shows the empty state', async () => {
    list.mockResolvedValue({ events: [], nextCursor: null });
    renderList();
    expect(await screen.findByText('No upcoming events')).toBeDefined();
  });

  it('shows Registered and Waitlisted states', async () => {
    list.mockResolvedValue({
      events: [
        { ...event, myRegistration: 'REGISTERED' as const },
        {
          ...event,
          id: 'b',
          title: 'Second',
          myRegistration: 'WAITLISTED' as const,
          capacityLeft: 0,
        },
      ],
      nextCursor: null,
    });
    renderList();
    expect(await screen.findByText('Registered')).toBeDefined();
    expect(screen.getByText('Waitlisted')).toBeDefined();
  });

  it('labels a cancelled event and offers no register button', async () => {
    list.mockResolvedValue({
      events: [{ ...event, cancelled: true, myRegistration: 'REGISTERED' as const }],
      nextCursor: null,
    });
    renderList();
    expect((await screen.findAllByText('Cancelled')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Register' })).toBeNull();
  });

  it('registers and reloads', async () => {
    register.mockResolvedValue({
      eventId: event.id,
      status: 'REGISTERED',
      registeredAt: '2026-09-26T00:00:00.000Z',
      cancelledAt: null,
    });
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Register' }));
    await waitFor(() => expect(register).toHaveBeenCalledWith(event.id));
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(1));
  });

  it('shows a clear error when registering is refused', async () => {
    register.mockRejectedValue(new Error('This event is for employers only.'));
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'Register' }));
    expect(await screen.findByText('This event is for employers only.')).toBeDefined();
  });

  it('offers a retry when loading fails', async () => {
    list.mockRejectedValueOnce(new Error('boom'));
    renderList();
    expect(await screen.findByText('boom')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByText('Campus drive')).toBeDefined();
  });
});
