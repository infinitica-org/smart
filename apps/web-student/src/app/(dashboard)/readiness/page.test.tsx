import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentReadinessSummary } from '@smart/contracts';
import ReadinessPage from './page';

const { getReadiness } = vi.hoisted(() => ({ getReadiness: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: { users: { getReadiness } } }));

function summary(over: Partial<StudentReadinessSummary> = {}): StudentReadinessSummary {
  return {
    generatedAt: '2026-09-25T00:00:00.000Z',
    identity: {
      status: 'NOT_STARTED',
      signals: [
        { code: 'EMAIL', verified: true, verifiedAt: null },
        { code: 'LINKEDIN', verified: false, verifiedAt: null },
        { code: 'GITHUB', verified: false, verifiedAt: null },
      ],
      supportedStatuses: ['NOT_STARTED', 'VERIFIED'],
      rule: 'Verified when your email is verified and at least one of LinkedIn or GitHub is verified. Pending and failed states are not tracked yet.',
    },
    evidence: {
      availability: 'NO_DATA',
      reason: 'Verify a skill to see which evidence it needs.',
      requirements: [],
      counts: {
        total: 0,
        verified: 0,
        provisional: 0,
        pending: 0,
        disputedOrRejected: 0,
        expired: 0,
      },
      completeness: null,
    },
    skillDemonstration: {
      skills: [],
      counts: { demonstrated: 0, provisional: 0, notDemonstrated: 0 },
    },
    proficiency: { verifiedSkillCount: 0, declaredSkillCount: 0, byLevel: {} },
    roleReadiness: {
      availability: 'NO_TARGET_ROLE',
      reason: 'Choose a target role to see how your skills line up.',
      targetRole: null,
      readinessPercent: null,
      skills: [],
      coverage: null,
    },
    openingReadiness: [],
    recommendations: [],
    ...over,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReadinessPage />
    </QueryClientProvider>,
  );
}

describe('ReadinessPage (PRF-02)', () => {
  beforeEach(() => {
    getReadiness.mockReset().mockResolvedValue(summary());
  });

  it('shows a loading message before data arrives', () => {
    getReadiness.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText(/Loading your readiness/i)).toBeTruthy();
    expect(screen.queryByTestId('identity-card')).toBeNull();
  });

  it('shows identity status with each signal (I332)', async () => {
    renderPage();
    const card = await screen.findByTestId('identity-card');

    expect(within(card).getByText('Not started')).toBeTruthy();
    expect(within(card).getByText('Email')).toBeTruthy();
    expect(within(card).getAllByText('not verified')).toHaveLength(2);
    expect(within(card).getByText(/Pending and failed states are not tracked yet/)).toBeTruthy();
  });

  it('shows verified identity', async () => {
    getReadiness.mockResolvedValue(
      summary({
        identity: {
          status: 'VERIFIED',
          signals: [
            { code: 'EMAIL', verified: true, verifiedAt: null },
            { code: 'LINKEDIN', verified: true, verifiedAt: '2026-09-01T00:00:00.000Z' },
            { code: 'GITHUB', verified: false, verifiedAt: null },
          ],
          supportedStatuses: ['NOT_STARTED', 'VERIFIED'],
          rule: 'rule',
        },
      }),
    );
    renderPage();

    const card = await screen.findByTestId('identity-card');
    expect(within(card).getByText('Verified')).toBeTruthy();
  });

  it('says evidence completeness is not calculated instead of inventing a score (I333)', async () => {
    renderPage();
    const card = await screen.findByTestId('evidence-card');

    expect(within(card).getByText('Not calculated yet')).toBeTruthy();
    expect(within(card).getByText(/Verify a skill to see which evidence it needs/)).toBeTruthy();
    expect(within(card).getByText(/You have no evidence yet/)).toBeTruthy();
    expect(within(card).queryByText(/%/)).toBeNull();
  });

  it('shows evidence counts when evidence exists', async () => {
    getReadiness.mockResolvedValue(
      summary({
        evidence: {
          ...summary().evidence,
          counts: {
            total: 5,
            verified: 3,
            provisional: 1,
            pending: 1,
            disputedOrRejected: 0,
            expired: 0,
          },
        },
      }),
    );
    renderPage();

    const card = await screen.findByTestId('evidence-card');
    expect(within(card).getByText('Verified').nextSibling?.textContent).toBe('3');
    expect(within(card).queryByText(/You have no evidence yet/)).toBeNull();
  });

  it('shows each skill with its demonstration status and only a verified proficiency (I334, I335)', async () => {
    getReadiness.mockResolvedValue(
      summary({
        skillDemonstration: {
          skills: [
            {
              skillCode: 'PY',
              skillName: 'Python',
              claimStatus: 'VERIFIED',
              proficiency: 'ADVANCED',
              demonstration: 'DEMONSTRATED',
              verifiedEvidenceCount: 1,
              provisionalEvidenceCount: 0,
              evidenceUndisclosable: false,
            },
            {
              skillCode: 'SQL',
              skillName: 'SQL',
              claimStatus: 'DECLARED',
              proficiency: null,
              demonstration: 'NOT_DEMONSTRATED',
              verifiedEvidenceCount: 0,
              provisionalEvidenceCount: 0,
              evidenceUndisclosable: true,
            },
          ],
          counts: { demonstrated: 1, provisional: 0, notDemonstrated: 1 },
        },
        proficiency: { verifiedSkillCount: 1, declaredSkillCount: 1, byLevel: { ADVANCED: 1 } },
      }),
    );
    renderPage();

    const demo = await screen.findByTestId('demonstration-card');
    expect(within(demo).getByText('Proficiency: Advanced')).toBeTruthy();
    expect(
      within(demo).getByText(/Proficiency: not verified yet · Evidence under NDA/),
    ).toBeTruthy();
    expect(within(demo).getByText('Demonstrated')).toBeTruthy();
    expect(within(demo).getByText('Not demonstrated')).toBeTruthy();

    // Proficiency is its own card and does not mention evidence completeness.
    const proficiency = screen.getByTestId('proficiency-card');
    expect(within(proficiency).getByText('1 verified · 1 not yet verified')).toBeTruthy();
    expect(within(proficiency).getByText('Advanced: 1')).toBeTruthy();
    expect(within(proficiency).queryByText(/complet/i)).toBeNull();
  });

  it('shows empty states for skills and proficiency', async () => {
    renderPage();
    expect(await screen.findByText('You have not selected any skills yet.')).toBeTruthy();
    expect(screen.getByText('No verified proficiency yet.')).toBeTruthy();
  });

  it('asks the student to choose a target role when there is none (I336)', async () => {
    renderPage();
    const card = await screen.findByTestId('role-card');
    expect(within(card).getByText('Not calculated yet')).toBeTruthy();
    expect(
      within(card).getByText('Choose a target role to see how your skills line up.'),
    ).toBeTruthy();
  });

  it('lists role skills, marks optional ones as not affecting readiness, and never shows a made-up percentage (I336, I338)', async () => {
    getReadiness.mockResolvedValue(
      summary({
        roleReadiness: {
          availability: 'NOT_CONFIGURED',
          reason: 'The minimum proficiency for each role skill is not defined yet (pending I360).',
          targetRole: { roleId: 'BACKEND_DEVELOPER', name: 'Backend Developer' },
          readinessPercent: null,
          skills: [
            {
              skillCode: 'PY',
              skillName: 'Python',
              requirement: 'RECOMMENDED',
              affectsReadiness: true,
              selected: true,
              claimStatus: 'VERIFIED',
              proficiency: 'ADVANCED',
              demonstration: 'DEMONSTRATED',
              evidenceUndisclosable: false,
            },
            {
              skillCode: 'NOSQL',
              skillName: 'NoSQL',
              requirement: 'OPTIONAL',
              affectsReadiness: false,
              selected: false,
              claimStatus: null,
              proficiency: null,
              demonstration: 'NOT_DEMONSTRATED',
              evidenceUndisclosable: false,
            },
          ],
          coverage: {
            recommendedTotal: 4,
            recommendedVerified: 1,
            recommendedDemonstrated: 1,
            optionalTotal: 1,
            optionalVerified: 0,
          },
        },
      }),
    );
    renderPage();

    const card = await screen.findByTestId('role-card');
    expect(within(card).getByText('Backend Developer')).toBeTruthy();
    expect(within(card).getByText('Not calculated yet')).toBeTruthy();
    expect(within(card).getByText(/I360/)).toBeTruthy();
    expect(within(card).getByText(/Recommended skills verified: 1 of\s+4/)).toBeTruthy();
    expect(
      within(card).getByText('Optional · does not affect your readiness · not added'),
    ).toBeTruthy();
    expect(within(card).queryByText(/% ready/)).toBeNull();
  });

  it('shows a readiness percentage only when the API provides one', async () => {
    getReadiness.mockResolvedValue(
      summary({
        roleReadiness: {
          availability: 'AVAILABLE',
          reason: null,
          targetRole: { roleId: 'BACKEND_DEVELOPER', name: 'Backend Developer' },
          readinessPercent: 72,
          skills: [],
          coverage: null,
        },
      }),
    );
    renderPage();

    expect(await screen.findByText('72% ready')).toBeTruthy();
  });

  it('lists recommendations as links, and labels optional ones (I337)', async () => {
    getReadiness.mockResolvedValue(
      summary({
        recommendations: [
          {
            id: 'skill-PY',
            kind: 'VERIFY_SKILL',
            priority: 'HIGH',
            optional: false,
            skillCode: 'PY',
            title: 'Verify Python',
            detail: 'Take the diagnostic assessment to verify this skill.',
            href: '/assessments',
          },
          {
            id: 'skill-NOSQL',
            kind: 'ADD_ROLE_SKILL',
            priority: 'LOW',
            optional: true,
            skillCode: 'NOSQL',
            title: 'Add NoSQL',
            detail: 'NoSQL is an optional skill for Backend Developer.',
            href: '/skills',
          },
        ],
      }),
    );
    renderPage();

    const card = await screen.findByTestId('recommendations-card');
    expect(
      within(card)
        .getByRole('link', { name: /Verify Python/ })
        .getAttribute('href'),
    ).toBe('/assessments');
    expect(
      within(card)
        .getByRole('link', { name: /Add NoSQL/ })
        .getAttribute('href'),
    ).toBe('/skills');
    expect(within(card).getByText('Optional')).toBeTruthy();
    expect(within(card).getByText('High')).toBeTruthy();
  });

  it('says there is nothing to recommend when there are no gaps', async () => {
    renderPage();
    expect(await screen.findByText(/Nothing to recommend right now/)).toBeTruthy();
  });

  it('shows a recoverable error and reloads on retry', async () => {
    getReadiness.mockRejectedValueOnce(new Error('network')).mockResolvedValue(summary());
    renderPage();

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /could not load your readiness/i,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(getReadiness).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('identity-card')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows real evidence completeness and which required items are missing (I333)', async () => {
    getReadiness.mockResolvedValue(
      summary({
        evidence: {
          availability: 'AVAILABLE',
          reason: null,
          requirements: [
            {
              skillCode: 'SQL',
              skillName: 'SQL',
              level: 'ADVANCED',
              requirement: 'REAL_WORLD_APPLICATION',
              met: true,
            },
            {
              skillCode: 'DOCKER',
              skillName: 'Containers',
              level: 'PROFESSIONAL',
              requirement: 'SUBSTANTIAL_APPLICATION',
              met: false,
            },
          ],
          counts: {
            total: 2,
            verified: 1,
            provisional: 0,
            pending: 1,
            disputedOrRejected: 0,
            expired: 0,
          },
          completeness: { required: 2, available: 1, percent: 50 },
        },
      }),
    );
    renderPage();

    const card = await screen.findByTestId('evidence-card');
    expect(within(card).getByText('1 / 2 required items (50%)')).toBeTruthy();
    const list = within(card).getByRole('list', { name: 'Required evidence' });
    expect(
      within(list).getByText(/SQL \(Advanced\): Real-world project or work experience/),
    ).toBeTruthy();
    expect(within(list).getByText(/Containers \(Professional\): Substantial project/)).toBeTruthy();
    expect(within(list).getByText('Present')).toBeTruthy();
    expect(within(list).getByText('Missing')).toBeTruthy();
    expect(within(card).queryByText('Not calculated yet')).toBeNull();
  });

  it('says nothing is missing when no evidence is required at the verified levels', async () => {
    getReadiness.mockResolvedValue(
      summary({
        evidence: {
          availability: 'AVAILABLE',
          reason: 'No evidence is required at your verified levels.',
          requirements: [],
          counts: {
            total: 0,
            verified: 0,
            provisional: 0,
            pending: 0,
            disputedOrRejected: 0,
            expired: 0,
          },
          completeness: { required: 0, available: 0, percent: 100 },
        },
      }),
    );
    renderPage();

    const card = await screen.findByTestId('evidence-card');
    expect(within(card).getByText('Nothing missing')).toBeTruthy();
    expect(within(card).getByText('No evidence is required at your verified levels.')).toBeTruthy();
    expect(within(card).queryByRole('list', { name: 'Required evidence' })).toBeNull();
  });

  it('says there are no open roles when none exist (I336)', async () => {
    renderPage();
    const card = await screen.findByTestId('openings-card');
    expect(within(card).getByText(/No open roles with required skills/)).toBeTruthy();
  });

  it('shows readiness for each open role using the employer minimums (I336)', async () => {
    getReadiness.mockResolvedValue(
      summary({
        openingReadiness: [
          {
            openingId: 'o1',
            roleTitle: 'Backend Engineer',
            companyName: 'Acme',
            location: 'Pune',
            availability: 'AVAILABLE',
            reason: null,
            requiredCount: 3,
            readyCount: 1,
            readinessPercent: 33,
            skills: [
              {
                skillCode: 'PY',
                skillName: 'Python',
                minProficiency: 'INTERMEDIATE',
                studentProficiency: 'ADVANCED',
                status: 'MEETS_MINIMUM',
                evidenceRequired: 0,
                evidenceMet: 0,
                ready: true,
              },
              {
                skillCode: 'SQL',
                skillName: 'SQL',
                minProficiency: 'ADVANCED',
                studentProficiency: 'ADVANCED',
                status: 'MEETS_MINIMUM',
                evidenceRequired: 1,
                evidenceMet: 0,
                ready: false,
              },
              {
                skillCode: 'DOCKER',
                skillName: 'Containers',
                minProficiency: 'BEGINNER',
                studentProficiency: null,
                status: 'NOT_HELD',
                evidenceRequired: 0,
                evidenceMet: 0,
                ready: false,
              },
            ],
          },
        ],
      }),
    );
    renderPage();

    const role = await screen.findByTestId('opening-readiness');
    expect(within(role).getByText('Backend Engineer')).toBeTruthy();
    expect(within(role).getByText('Acme · Pune')).toBeTruthy();
    expect(within(role).getByText('33% ready')).toBeTruthy();
    expect(within(role).getByText('1 of 3 required skills ready')).toBeTruthy();
    expect(within(role).getByText('Needs Intermediate · Meets minimum')).toBeTruthy();
    expect(within(role).getByText('Needs Advanced · Meets minimum · Evidence 0/1')).toBeTruthy();
    expect(within(role).getByText('Needs Beginner · Not added')).toBeTruthy();
    expect(within(role).getAllByText('Ready')).toHaveLength(1);
    expect(within(role).getAllByText('Not ready')).toHaveLength(2);
  });

  it('shows no score for a role that lists no required skills (I336)', async () => {
    getReadiness.mockResolvedValue(
      summary({
        openingReadiness: [
          {
            openingId: 'o2',
            roleTitle: 'Analyst',
            companyName: 'Globex',
            location: null,
            availability: 'NOT_CONFIGURED',
            reason:
              'This role does not list any required skills yet, so readiness cannot be calculated.',
            requiredCount: 0,
            readyCount: 0,
            readinessPercent: null,
            skills: [],
          },
        ],
      }),
    );
    renderPage();

    const role = await screen.findByTestId('opening-readiness');
    expect(within(role).getByText('Not calculated')).toBeTruthy();
    expect(within(role).getByText(/does not list any required skills/)).toBeTruthy();
    expect(within(role).queryByText(/% ready/)).toBeNull();
  });
});
