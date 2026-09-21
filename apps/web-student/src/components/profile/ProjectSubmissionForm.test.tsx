import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CandidateOnboardingProfile,
  CandidateOnboardingProfileResponse,
} from '@smart/contracts';
import { buildSkillLibraryResponse } from '@smart/contracts';
import { ProjectSubmissionForm } from './ProjectSubmissionForm';

const emptyOnboardingResponse = (): CandidateOnboardingProfileResponse => ({
  profile: null,
  draft: null,
  profilePhotoUrl: null,
  onboardingCompleted: false,
});

const useFeatureFlag = vi.fn(() => true);
const useOnboarding = vi.fn(() => ({
  data: emptyOnboardingResponse(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/entitlements', () => ({
  useFeatureFlag: () => useFeatureFlag(),
}));

vi.mock('../../lib/use-onboarding', () => ({
  useOnboarding: () => useOnboarding(),
}));

const create = vi.fn();
const get = vi.fn();
const listMine = vi.fn();
const getOnboarding = vi.fn();
const listGithubRepos = vi.fn();
const githubRepoReadme = vi.fn();
const studentEntitlements = vi.fn();
const skillLibrary = vi.fn();
const replaceProjectSkillMappings = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    projects: {
      create: (...args: unknown[]) => create(...args),
      get: (...args: unknown[]) => get(...args),
      listMine: (...args: unknown[]) => listMine(...args),
    },
    catalog: {
      skillLibrary: (...args: unknown[]) => skillLibrary(...args),
    },
    evidence: {
      replaceProjectSkillMappings: (...args: unknown[]) => replaceProjectSkillMappings(...args),
    },
    users: {
      getOnboarding: (...args: unknown[]) => getOnboarding(...args),
      listGithubRepos: (...args: unknown[]) => listGithubRepos(...args),
      githubRepoReadme: (...args: unknown[]) => githubRepoReadme(...args),
    },
    onboarding: {
      studentEntitlements: (...args: unknown[]) => studentEntitlements(...args),
    },
  },
}));

function renderForm(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProjectSubmissionForm />
    </QueryClientProvider>,
  );
}

async function openAddProjectModal() {
  const addBtn = await screen.findByRole('button', { name: /Add your first project/i });
  fireEvent.click(addBtn);
  await screen.findByRole('dialog');
}

async function openManualProjectModal() {
  await openAddProjectModal();
  fireEvent.click(screen.getByRole('button', { name: /Add manually/i }));
  await screen.findByLabelText(/^Title$/i);
}

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

function formScope() {
  return within(screen.getByRole('dialog'));
}

const validFill = () => {
  const form = formScope();
  fireEvent.change(form.getByLabelText(/^Title$/i), { target: { value: 'Campus bus tracker' } });
  fireEvent.change(form.getByLabelText(/^Problem$/i), {
    target: { value: 'Students cannot see live bus location on campus routes.' },
  });
  fireEvent.change(form.getByLabelText(/^Approach$/i), {
    target: { value: 'I used websockets and a small GPS ingest service.' },
  });
  fireEvent.change(form.getByLabelText(/^Skills$/i), {
    target: { value: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT' },
  });
  fireEvent.change(form.getByLabelText(/^Outcome$/i), {
    target: { value: 'Average wait time dropped in a 30-student pilot.' },
  });
  fireEvent.change(form.getByLabelText(/GitHub link/i), {
    target: { value: 'https://github.com/org/repo' },
  });
};

describe('ProjectSubmissionForm', () => {
  beforeEach(() => {
    useFeatureFlag.mockReset().mockReturnValue(true);
    useOnboarding.mockReset().mockReturnValue({
      data: emptyOnboardingResponse(),
    });
    create.mockReset();
    get.mockReset();
    listMine.mockReset().mockResolvedValue({ projects: [] });
    getOnboarding.mockReset().mockResolvedValue({ profile: { socialVerification: null } });
    listGithubRepos.mockReset();
    githubRepoReadme.mockReset();
    studentEntitlements.mockReset().mockResolvedValue({
      planCode: 'PRO',
      flags: [{ key: 'project_verification', name: 'Project verification', enabled: true }],
    });
    skillLibrary.mockReset().mockResolvedValue(buildSkillLibraryResponse());
    replaceProjectSkillMappings.mockReset().mockResolvedValue([]);
  });

  it('blocks submit when the problem is too short', async () => {
    renderForm();
    await openManualProjectModal();
    const form = formScope();
    fireEvent.change(form.getByLabelText(/^Title$/i), { target: { value: 'App' } });
    fireEvent.change(form.getByLabelText(/^Problem$/i), { target: { value: 'too short' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText(/Fix the highlighted template fields/i)).toBeTruthy();
  });

  it('queues create, shows an explicit Verifying state, and offers to submit another', async () => {
    create.mockResolvedValueOnce(busTracker);

    renderForm();
    await openManualProjectModal();
    validFill();
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      title: 'Campus bus tracker',
      githubUrl: 'https://github.com/org/repo',
    });
    await waitFor(() => expect(replaceProjectSkillMappings).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getAllByText(/^Verifying$/i).length).toBeGreaterThanOrEqual(1),
    );
    expect(screen.getAllByText(/Integrity verification is running/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.queryByText(/^Submitting…$/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Submit another project/i }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /Add manually/i }));
    expect((formScope().getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe('');
    expect(
      (screen.getByRole('button', { name: /Submit project/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
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

    renderForm();

    expect(await screen.findByText('Campus bus tracker')).toBeTruthy();
    expect(screen.getByText('Portfolio site')).toBeTruthy();
    expect(screen.getByText(/^Verified$/i)).toBeTruthy();
    expect(screen.getByText(/Your technology stack/i).closest('p')?.textContent).toMatch(
      /TypeScript/,
    );
  });

  it('sends an optional live link when filled in', async () => {
    create.mockResolvedValueOnce({ ...busTracker, liveUrl: 'https://bus-tracker.example.com' });

    renderForm();
    await openManualProjectModal();
    validFill();
    fireEvent.change(formScope().getByLabelText(/Live link/i), {
      target: { value: 'https://bus-tracker.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit project/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      liveUrl: 'https://bus-tracker.example.com',
    });
  });

  it('loads repos using githubUrl when socialVerification login is missing', async () => {
    useOnboarding.mockReturnValue({
      data: {
        ...emptyOnboardingResponse(),
        profile: {
          githubUrl: 'https://github.com/octocat',
          socialVerification: { linkedin: null, github: null },
        } as unknown as CandidateOnboardingProfile,
      },
    });
    listGithubRepos.mockResolvedValueOnce({ repos: [] });

    renderForm();
    fireEvent.click(await screen.findByRole('button', { name: /^Import from GitHub$/i }));
    await waitFor(() => expect(listGithubRepos).toHaveBeenCalledWith({ login: 'octocat' }));
  });

  it('imports a picked repo, prefilling title, GitHub link, and README as the approach', async () => {
    useOnboarding.mockReturnValue({
      data: {
        ...emptyOnboardingResponse(),
        profile: {
          socialVerification: {
            linkedin: null,
            github: { login: 'octocat', verified: true, selectedRepos: [] },
          },
        } as unknown as CandidateOnboardingProfile,
      },
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

    renderForm();
    fireEvent.click(await screen.findByRole('button', { name: /^Import from GitHub$/i }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(listGithubRepos).toHaveBeenCalledWith({ login: 'octocat' }));

    fireEvent.click(within(dialog).getByRole('button', { name: /Use this repository/i }));
    await waitFor(() =>
      expect(githubRepoReadme).toHaveBeenCalledWith({ fullName: 'octocat/bus-tracker' }),
    );

    await waitFor(() =>
      expect((formScope().getByLabelText(/^Title$/i) as HTMLInputElement).value).toBe(
        'bus-tracker',
      ),
    );
    expect((formScope().getByLabelText(/GitHub link/i) as HTMLInputElement).value).toBe(
      'https://github.com/octocat/bus-tracker',
    );
    expect((formScope().getByLabelText(/^Approach$/i) as HTMLTextAreaElement).value).toBe(
      '# Bus tracker\n\nTracks buses live.',
    );
  });

  it("hides the submission form when the institution's plan lacks project_verification", async () => {
    useFeatureFlag.mockReturnValue(false);

    renderForm();

    expect(
      await screen.findByText(/Project verification isn't on your institution's plan/i),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Submit project/i })).toBeNull();
    expect(screen.queryByLabelText(/Title/i)).toBeNull();
  });
});
