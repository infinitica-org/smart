import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectSubmissionForm } from './ProjectSubmissionForm';

const create = vi.fn();
const get = vi.fn();
const listMine = vi.fn();
const getOnboarding = vi.fn();
const listGithubRepos = vi.fn();
const githubRepoReadme = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    projects: {
      create: (...args: unknown[]) => create(...args),
      get: (...args: unknown[]) => get(...args),
      listMine: (...args: unknown[]) => listMine(...args),
    },
    users: {
      getOnboarding: (...args: unknown[]) => getOnboarding(...args),
      listGithubRepos: (...args: unknown[]) => listGithubRepos(...args),
      githubRepoReadme: (...args: unknown[]) => githubRepoReadme(...args),
    },
  },
}));

const busTracker = {
  projectId: '123e4567-e89b-12d3-a456-426614174000',
  studentId: '123e4567-e89b-12d3-a456-426614174001',
  title: 'Campus bus tracker',
  problem: 'Students cannot see live bus location on campus routes.',
  approach: 'I used websockets and a small GPS ingest service.',
  stack: 'TypeScript, Nest',
  outcome: 'Average wait time dropped in a 30-student pilot.',
  loomUrl: 'https://www.loom.com/share/abc123',
  githubUrl: null,
  liveUrl: null,
  status: 'SUBMITTED',
  createdAt: '2026-09-02T10:00:00.000Z',
  report: null,
};

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
    listMine.mockReset().mockResolvedValue({ projects: [] });
    getOnboarding.mockReset().mockResolvedValue({ profile: { socialVerification: null } });
    listGithubRepos.mockReset();
    githubRepoReadme.mockReset();
  });

  it('blocks submit when the problem is too short', () => {
    render(<ProjectSubmissionForm />);
    fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: 'App' } });
    fireEvent.change(screen.getByLabelText(/^Problem$/i), { target: { value: 'too short' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText(/Fix the highlighted template fields/i)).toBeTruthy();
  });

  it('queues create, shows an explicit Processing state, and offers to submit another', async () => {
    create.mockResolvedValueOnce(busTracker);

    render(<ProjectSubmissionForm />);
    validFill();
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      title: 'Campus bus tracker',
      loomUrl: 'https://www.loom.com/share/abc123',
    });
    // Both the processing Alert and the project's own status badge say "Processing".
    await waitFor(() => expect(screen.getAllByText(/^Processing$/i).length).toBe(2));
    expect(screen.getByText(/queued for verification/i)).toBeTruthy();
    expect(screen.queryByText(/^Submitting…$/i)).toBeNull();

    // The form is not locked — a second project can be started right away.
    expect((screen.getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe('');
    expect(
      (screen.getByRole('button', { name: /Submit project/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /Submit another project/i }));
    // The list entry's own status badge survives — only the processing Alert is dismissed.
    expect(screen.getAllByText(/^Processing$/i).length).toBe(1);
  });

  it('lists every submitted project with a top-stack summary', async () => {
    listMine.mockResolvedValue({
      projects: [
        busTracker,
        {
          ...busTracker,
          projectId: '223e4567-e89b-12d3-a456-426614174002',
          title: 'Portfolio site',
          stack: 'TypeScript, React',
          status: 'VERIFIED',
        },
      ],
    });

    render(<ProjectSubmissionForm />);

    expect(await screen.findByText('Campus bus tracker')).toBeTruthy();
    expect(screen.getByText('Portfolio site')).toBeTruthy();
    expect(screen.getByText(/^Verified$/i)).toBeTruthy();
    // TypeScript appears in both projects, so it leads the top-stack summary.
    const topStack = screen.getByText('Top stack').closest('div');
    expect(topStack?.textContent).toMatch(/TypeScript.*2/);
  });

  it('sends an optional live link when filled in', async () => {
    create.mockResolvedValueOnce({ ...busTracker, liveUrl: 'https://bus-tracker.example.com' });

    render(<ProjectSubmissionForm />);
    validFill();
    fireEvent.change(screen.getByLabelText(/Live link/i), {
      target: { value: 'https://bus-tracker.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      liveUrl: 'https://bus-tracker.example.com',
    });
  });

  it('imports a picked repo, prefilling title, stack, GitHub link, and README as the approach', async () => {
    getOnboarding.mockResolvedValue({
      profile: { socialVerification: { github: { login: 'octocat', verified: true } } },
    });
    listGithubRepos.mockResolvedValueOnce({
      repos: [
        {
          id: 1,
          fullName: 'octocat/bus-tracker',
          description: 'Live campus bus tracker',
          htmlUrl: 'https://github.com/octocat/bus-tracker',
          stars: 4,
          primaryLanguage: 'TypeScript',
        },
      ],
    });
    githubRepoReadme.mockResolvedValueOnce({ readme: '# Bus tracker\n\nTracks buses live.' });

    render(<ProjectSubmissionForm />);
    await waitFor(() => expect(getOnboarding).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Import from GitHub/i }));
    await waitFor(() => expect(listGithubRepos).toHaveBeenCalledWith({ login: 'octocat' }));

    fireEvent.click(await screen.findByText('octocat/bus-tracker'));
    await waitFor(() =>
      expect(githubRepoReadme).toHaveBeenCalledWith({ fullName: 'octocat/bus-tracker' }),
    );

    await waitFor(() =>
      expect((screen.getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe('bus-tracker'),
    );
    expect((screen.getByLabelText(/^Stack$/i) as HTMLInputElement).value).toBe('TypeScript');
    expect((screen.getByLabelText(/GitHub link/i) as HTMLInputElement).value).toBe(
      'https://github.com/octocat/bus-tracker',
    );
    expect((screen.getByLabelText(/^Approach$/i) as HTMLTextAreaElement).value).toBe(
      '# Bus tracker\n\nTracks buses live.',
    );
  });
});
