import {
  SmartApiClient,
  createSmartApi,
  createRefreshAccessToken,
  getAccessToken,
} from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const IS_MOCK_ENV = process.env.NEXT_PUBLIC_MOCK_API !== 'false';
const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

/** In-memory mock of server-side onboardingCompleted (survives localStorage clears). */
let mockOnboardingCompleted = false;
let mockOnboardingProfile: unknown = null;
let mockSkillClaims: Array<{
  claimId: string;
  studentId: string;
  skillCode: string;
  proficiency: string;
  status: string;
  strikes: number;
  lockedUntil: string | null;
  lastAttemptId: string | null;
}> = [];
const mockProjects = new Map<string, Record<string, unknown>>();

const MOCK_L1_ITEMS = [
  {
    itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    competencyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    domainCode: 'A',
    itemType: 'MCQ_SINGLE',
    difficulty: 'EASY',
    promptText: 'Which hook runs a side effect after render?',
    options: [
      { optionId: 'opt-a', label: 'useEffect' },
      { optionId: 'opt-b', label: 'useMemo' },
    ],
    itemWeight: 1,
  },
  {
    itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    competencyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    domainCode: 'A',
    itemType: 'MCQ_SINGLE',
    difficulty: 'EASY',
    promptText: 'Which hook memoizes a value?',
    options: [
      { optionId: 'opt-c', label: 'useMemo' },
      { optionId: 'opt-d', label: 'useRef' },
    ],
    itemWeight: 1,
  },
];

let mockAttempt: {
  attemptId: string;
  studentId: string;
  trackCode: 'MBA_FINANCE';
  levelNumber: 1;
  levelFormat: 'MCQ';
  status: 'IN_PROGRESS' | 'SUBMITTED';
  formId: string;
  startedAt: string;
  expiresAt: string;
  currentItemIndex: number;
  integrityFlag: 'CLEAN';
} | null = null;
const mockDrafts = new Map<string, { kind: 'MCQ'; selectedOptionIds: string[] }>();

function mockSessionDto() {
  if (!mockAttempt) return null;
  const expiresAtMs = new Date(mockAttempt.expiresAt).getTime();
  const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  return {
    ...mockAttempt,
    serverRemainingSeconds: remaining,
    totalItems: MOCK_L1_ITEMS.length,
    answeredItems: mockDrafts.size,
    locked: mockAttempt.status !== 'IN_PROGRESS' || remaining <= 0,
  };
}

function mockStudentUser(overrides: Record<string, unknown> = {}) {
  return {
    userId: MOCK_USER_ID,
    email: 'student@example.com',
    fullName: 'Test Student',
    role: 'STUDENT',
    institutionId: '223e4567-e89b-12d3-a456-426614174000',
    institutionName: 'Mock Institution',
    primaryTrack: 'MBA_FINANCE',
    secondaryTrack: null,
    provider: 'GOOGLE',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    sessionHold: null,
    onboardingCompleted: mockOnboardingCompleted,
    ...overrides,
  };
}

function mockStudentAccessToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    sub: MOCK_USER_ID,
    role: 'STUDENT',
    inst: null,
    trk: [],
    fam: 'mock-family',
    iat: now,
    exp: now + 900,
    iss: 'smart',
    aud: 'smart-api',
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const b64 = btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
  return `eyJhbGciOiJub25lIn0.${b64}.mock`;
}

const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input.toString();
  const method = init?.method ?? 'GET';

  if (url.includes('/auth/login') && method === 'POST') {
    return new Response(
      JSON.stringify({
        accessToken: mockStudentAccessToken(),
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: mockStudentUser({
          institutionId: null,
          institutionName: null,
          primaryTrack: null,
          provider: 'PASSWORD',
          onboardingCompleted: false,
        }),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/auth/refresh') && method === 'POST') {
    return new Response(
      JSON.stringify({
        accessToken: mockStudentAccessToken(),
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: mockStudentUser({
          institutionId: null,
          institutionName: null,
          primaryTrack: null,
          provider: 'PASSWORD',
        }),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/auth/sso/start') && method === 'POST') {
    return new Response(
      JSON.stringify({
        authorizationUrl: 'http://localhost:3001/auth/callback?code=mock_code&state=mock_state',
        state: 'mock_state',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/auth/sso/callback') && method === 'POST') {
    return new Response(
      JSON.stringify({
        accessToken: mockStudentAccessToken(),
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: mockStudentUser({
          institutionId: null,
          institutionName: null,
          primaryTrack: null,
          onboardingCompleted: false,
        }),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/users/me/resume/parse') && method === 'POST') {
    const body = init?.body ? (JSON.parse(String(init.body)) as { rawText?: string }) : {};
    const rawText = body.rawText?.trim() ?? '';
    if (rawText.length < 40) {
      return new Response(JSON.stringify({ status: 'FAILED', draft: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        status: 'PARSED',
        draft: {
          basicInfo: {
            firstName: 'Ada',
            lastName: 'Lovelace',
            phoneNumber: '9876543210',
            phoneCountryCode: '+91',
            linkedinUrl: 'https://www.linkedin.com/in/ada',
          },
          education: [
            {
              institutionName: 'Mock University',
              degree: 'B.Tech',
              fieldOfStudy: 'Computer Science',
            },
          ],
          experiences: [
            {
              role: 'Intern',
              company: 'Example Corp',
              tags: ['TypeScript'],
            },
          ],
          skills: [
            { type: 'technical', name: 'TypeScript', proficiency: 'INTERMEDIATE' },
            { type: 'language', name: 'English', proficiency: 'FLUENT' },
          ],
          licenses: [],
          parseConfidence: 0.82,
          missingFields: [],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/users/me/onboarding/complete') && method === 'POST') {
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    if (body.dpdpConsent !== true) {
      return new Response(JSON.stringify({ error: 'validation_error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    mockOnboardingCompleted = true;
    mockOnboardingProfile = {
      ...body,
      dpdpConsentAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    return new Response(
      JSON.stringify(
        mockStudentUser({
          fullName: `${String(body.firstName)} ${String(body.lastName)}`.trim(),
          onboardingCompleted: true,
        }),
      ),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/users/me/onboarding') && method === 'GET') {
    return new Response(
      JSON.stringify({
        profile: mockOnboardingProfile,
        onboardingCompleted: mockOnboardingCompleted,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/users/me/track') && method === 'PUT') {
    return new Response(JSON.stringify(mockStudentUser({ onboardingCompleted: false })), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/users/me') && method === 'GET') {
    return new Response(JSON.stringify(mockStudentUser()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/institutions') && method === 'GET') {
    return new Response(
      JSON.stringify([
        {
          id: '1',
          name: 'Sri Ramakrishna College of Arts & Science',
          location: 'Coimbatore',
          type: 'Arts & Science',
        },
        { id: '2', name: 'ABC Engineering College', location: 'Bengaluru', type: 'Engineering' },
        { id: '3', name: 'XYZ University', location: 'Chennai', type: 'University' },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/catalog/tracks') && (!init || init.method === 'GET')) {
    return new Response(
      JSON.stringify([
        {
          trackId: '11111111-1111-4111-8111-111111111111',
          code: 'MBA_FINANCE',
          name: 'MBA Finance',
          description: 'Financial readiness and core concepts for management.',
          category: 'MBA',
          launchStatus: 'AVAILABLE_NEW',
          calibrationStatus: 'NOT_CALIBRATED',
          foundationWeight: 0.2,
          competencies: [],
          levels: [
            {
              levelId: '22222222-2222-4222-8222-222222222222',
              trackCode: 'MBA_FINANCE',
              levelNumber: 1,
              name: 'Foundation',
              format: 'MCQ',
              durationMinutes: 60,
              itemCount: 40,
              cutScoresPublished: false,
            },
          ],
          capstoneBrief: 'Finance track capstone.',
        },
        {
          trackId: '33333333-3333-4333-8333-333333333333',
          code: 'TECH_DATA_ANALYST',
          name: 'Business Analytics',
          description: 'Data analytics, reporting, and statistical modeling.',
          category: 'TECH',
          launchStatus: 'AVAILABLE_NEW',
          calibrationStatus: 'NOT_CALIBRATED',
          foundationWeight: 0.2,
          competencies: [],
          levels: [],
          capstoneBrief: 'Data Analyst capstone.',
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/assessment/start') && method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      trackCode?: string;
      levelNumber?: number;
    };
    if (body.levelNumber !== 1 || body.trackCode !== 'MBA_FINANCE') {
      return new Response(
        JSON.stringify({
          error: 'level_locked',
          message: 'L1 mock start accepts the enrolled MBA_FINANCE track only.',
          statusCode: 403,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (!mockAttempt || mockAttempt.status !== 'IN_PROGRESS') {
      const startedAt = new Date();
      mockAttempt = {
        attemptId: '55555555-5555-4555-8555-555555555555',
        studentId: MOCK_USER_ID,
        trackCode: 'MBA_FINANCE',
        levelNumber: 1,
        levelFormat: 'MCQ',
        status: 'IN_PROGRESS',
        formId: 'A',
        startedAt: startedAt.toISOString(),
        expiresAt: new Date(startedAt.getTime() + 60 * 60 * 1000).toISOString(),
        currentItemIndex: 0,
        integrityFlag: 'CLEAN',
      };
      mockDrafts.clear();
    }
    return new Response(JSON.stringify(mockSessionDto()), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/assessment/complete') && method === 'POST') {
    if (!mockAttempt) {
      return new Response(
        JSON.stringify({ error: 'not_found', message: 'Attempt not found.', statusCode: 404 }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }
    mockAttempt.status = 'SUBMITTED';
    return new Response(
      JSON.stringify({
        attemptId: mockAttempt.attemptId,
        status: 'SUBMITTED',
        evaluationJobId: null,
        estimatedResultSeconds: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/assessment/submit-l1') && method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      attemptId?: string;
      itemId?: string;
      answer?: { kind?: string; selectedOptionIds?: string[] };
    };
    if (!mockAttempt || body.attemptId !== mockAttempt.attemptId) {
      return new Response(
        JSON.stringify({ error: 'forbidden', message: 'Unknown attempt.', statusCode: 403 }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (body.itemId && body.answer?.kind === 'MCQ') {
      mockDrafts.set(body.itemId, {
        kind: 'MCQ',
        selectedOptionIds: body.answer.selectedOptionIds ?? [],
      });
    }
    const session = mockSessionDto();
    return new Response(
      JSON.stringify({
        accepted: true,
        superseded: false,
        answeredItems: mockDrafts.size,
        serverRemainingSeconds: session?.serverRemainingSeconds ?? 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const sessionMatch = url.match(/\/assessment\/([0-9a-f-]{36})\/session/i);
  if (sessionMatch && method === 'GET') {
    if (!mockAttempt || mockAttempt.attemptId !== sessionMatch[1]) {
      return new Response(
        JSON.stringify({ error: 'not_found', message: 'Session not found.', statusCode: 404 }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify(mockSessionDto()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nextMatch = url.match(/\/assessment\/([0-9a-f-]{36})\/next-item/i);
  if (nextMatch && method === 'GET') {
    if (!mockAttempt || mockAttempt.attemptId !== nextMatch[1]) {
      return new Response(
        JSON.stringify({ error: 'not_found', message: 'Item bank not found.', statusCode: 404 }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const parsedUrl = new URL(url, 'http://localhost');
    const rawIndex = parsedUrl.searchParams.get('index');
    if (rawIndex !== null) {
      mockAttempt.currentItemIndex = Number.parseInt(rawIndex, 10);
    }
    const index = mockAttempt.currentItemIndex;
    const item = MOCK_L1_ITEMS[index] ?? null;
    return new Response(
      JSON.stringify({
        attemptId: mockAttempt.attemptId,
        item,
        index,
        totalItems: MOCK_L1_ITEMS.length,
        savedDraft: item ? mockDrafts.get(item.itemId) : undefined,
        serverRemainingSeconds: mockSessionDto()?.serverRemainingSeconds ?? 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/assessment/skill-claims') && method === 'GET') {
    return new Response(JSON.stringify(mockSkillClaims), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/assessment/skill-claims') && method === 'POST') {
    const body = JSON.parse(String(init?.body ?? '{}')) as {
      skillCode?: string;
      proficiency?: string;
    };
    const row = {
      claimId: crypto.randomUUID(),
      studentId: MOCK_USER_ID,
      skillCode: body.skillCode ?? 'UNKNOWN',
      proficiency: body.proficiency ?? 'BEGINNER',
      status: 'DECLARED',
      strikes: 0,
      lockedUntil: null,
      lastAttemptId: null,
    };
    mockSkillClaims = [row, ...mockSkillClaims.filter((c) => c.skillCode !== row.skillCode)];
    return new Response(JSON.stringify(row), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/projects') && method === 'POST' && !url.includes('github')) {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    const projectId = crypto.randomUUID();
    const row = {
      projectId,
      studentId: MOCK_USER_ID,
      title: body.title,
      problem: body.problem,
      approach: body.approach,
      stack: body.stack,
      outcome: body.outcome,
      loomUrl: body.loomUrl ?? null,
      githubUrl: body.githubUrl ?? null,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      report: null,
    };
    mockProjects.set(projectId, row);
    return new Response(JSON.stringify(row), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const projectGet = url.match(/\/projects\/([0-9a-f-]{36})/i);
  if (projectGet && method === 'GET') {
    const row = mockProjects.get(projectGet[1] ?? '');
    if (!row) {
      return new Response(JSON.stringify({ error: 'not_found', message: 'Project not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(row), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/me/applications') && method === 'GET') {
    return new Response(
      JSON.stringify({
        applications: [
          {
            applicationId: '123e4567-e89b-12d3-a456-426614174010',
            openingId: '123e4567-e89b-12d3-a456-426614174011',
            studentId: MOCK_USER_ID,
            stage: 'SHORTLISTED',
            matchScore: 0.88,
            createdAt: '2026-09-01T08:00:00.000Z',
            updatedAt: '2026-09-02T10:00:00.000Z',
            companyName: 'Acme Labs',
            roleTitle: 'Backend Engineer',
            location: 'Bengaluru',
            employmentType: 'FULL_TIME',
            domain: 'SOFTWARE_IT',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // eslint-disable-next-line no-restricted-globals
  return fetch(input, init);
};

// eslint-disable-next-line no-restricted-globals
export const smartFetch = IS_MOCK_ENV ? (mockFetch as typeof fetch) : fetch;

export const apiClient = new SmartApiClient({
  baseUrl,
  fetchImpl: IS_MOCK_ENV ? (mockFetch as typeof fetch) : undefined,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
});

export const api = createSmartApi(apiClient);
