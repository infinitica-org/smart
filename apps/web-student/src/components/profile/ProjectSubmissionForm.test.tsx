import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectSubmissionForm } from './ProjectSubmissionForm';

const create = vi.fn();
const get = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    projects: {
      create: (...args: unknown[]) => create(...args),
      get: (...args: unknown[]) => get(...args),
    },
  },
}));

const validFill = () => {
  fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: 'Campus bus tracker' } });
  fireEvent.change(screen.getByLabelText(/^Problem$/i), {
    target: { value: 'Students cannot see live bus location on campus routes.' },
  });
  fireEvent.change(screen.getByLabelText(/^Approach$/i), {
    target: { value: 'I used websockets and a small GPS ingest service.' },
  });
  fireEvent.change(screen.getByLabelText(/^Stack$/i), { target: { value: 'TypeScript, Nest' } });
  fireEvent.change(screen.getByLabelText(/^Outcome$/i), {
    target: { value: 'Average wait time dropped in a 30-student pilot.' },
  });
  fireEvent.change(screen.getByLabelText(/Loom link/i), {
    target: { value: 'https://www.loom.com/share/abc123' },
  });
};

describe('ProjectSubmissionForm', () => {
  beforeEach(() => {
    create.mockReset();
    get.mockReset();
  });

  it('blocks submit when the problem is too short', () => {
    render(<ProjectSubmissionForm />);
    fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: 'App' } });
    fireEvent.change(screen.getByLabelText(/^Problem$/i), { target: { value: 'too short' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText(/Fix the highlighted template fields/i)).toBeTruthy();
  });

  it('queues create and shows an explicit Processing state', async () => {
    create.mockResolvedValueOnce({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Campus bus tracker',
      problem: 'Students cannot see live bus location on campus routes.',
      approach: 'I used websockets and a small GPS ingest service.',
      stack: 'TypeScript, Nest',
      outcome: 'Average wait time dropped in a 30-student pilot.',
      loomUrl: 'https://www.loom.com/share/abc123',
      githubUrl: null,
      status: 'SUBMITTED',
      createdAt: '2026-09-02T10:00:00.000Z',
      report: null,
    });

    render(<ProjectSubmissionForm />);
    validFill();
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      title: 'Campus bus tracker',
      loomUrl: 'https://www.loom.com/share/abc123',
    });
    await waitFor(() => expect(screen.getByText(/^Processing$/i)).toBeTruthy());
    expect(screen.getByText(/queued for verification/i)).toBeTruthy();
    expect(screen.queryByText(/^Submitting…$/i)).toBeNull();
  });
});
