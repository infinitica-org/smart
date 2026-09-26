import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventForm } from './EventForm';

afterEach(cleanup);

function future(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 16);
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('EventForm', () => {
  it('shows field-level errors and sends nothing when invalid', async () => {
    const onSubmit = vi.fn();
    render(<EventForm submitLabel="Save draft" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Title is required.')).toBeDefined();
    expect(screen.getByText('Choose a start date and time.')).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires an end after the start, and a location or online link', async () => {
    const onSubmit = vi.fn();
    render(<EventForm submitLabel="Save draft" onSubmit={onSubmit} />);
    fill('Title', 'Campus drive');
    fill('Starts', future(10));
    fill('Ends', future(9));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('End must be after the start.')).toBeDefined();
    expect(screen.getByText('Give a location or an online link.')).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a start in the past and a capacity below 1', async () => {
    const onSubmit = vi.fn();
    render(<EventForm submitLabel="Save draft" onSubmit={onSubmit} />);
    fill('Title', 'Campus drive');
    fill('Location', 'Hall');
    fill('Starts', '2020-01-01T10:00');
    fill('Ends', '2020-01-01T11:00');
    fill('Capacity (optional)', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('The event must start in the future.')).toBeDefined();
    expect(screen.getByText('Capacity must be a whole number, at least 1.')).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits UTC times with the chosen timezone', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EventForm submitLabel="Save draft" onSubmit={onSubmit} />);
    fill('Title', 'Campus drive');
    fill('Timezone', 'UTC');
    fill('Starts', future(10));
    fill('Ends', future(11));
    fill('Location', 'Main hall');
    fill('Capacity (optional)', '50');
    fireEvent.click(screen.getByLabelText(/Let approved employers register/));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = onSubmit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent).toMatchObject({
      title: 'Campus drive',
      timezone: 'UTC',
      location: 'Main hall',
      capacity: 50,
      employerRegistration: true,
      audience: 'STUDENTS',
    });
    expect(String(sent.startsAt)).toMatch(/Z$/);
  });

  it('in edit mode sends only the fields that changed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const event = {
      id: '11111111-1111-4111-8111-111111111111',
      institutionId: '22222222-2222-4222-8222-222222222222',
      title: 'Drive',
      description: '',
      startsAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 11 * 86_400_000).toISOString(),
      timezone: 'UTC',
      location: 'Hall',
      onlineUrl: null,
      capacity: null,
      audience: 'STUDENTS' as const,
      employerRegistration: false,
      status: 'PUBLISHED' as const,
      cancelReason: null,
      version: 2,
      updatedAt: new Date().toISOString(),
      registeredCount: 0,
      waitlistedCount: 0,
    };
    render(<EventForm event={event} submitLabel="Save changes" onSubmit={onSubmit} />);
    fill('Title', 'Renamed drive');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: 'Renamed drive' }));
  });
});
