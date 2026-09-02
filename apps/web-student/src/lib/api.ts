import { SmartApiClient, createSmartApi } from '@smart/api-client';
import { StudentProfileDataSchema } from '@smart/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const IS_MOCK_ENV = process.env.NEXT_PUBLIC_MOCK_API === 'true';
const PROFILE_STORAGE_KEY = 'smart.student.profile';

function emptyLocalProfile() {
  return {
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    experiences: [],
    subjects: [],
    preferences: [] as string[],
    dpdpConsent: false,
  };
}

function readLocalProfile(): Record<string, unknown> {
  if (typeof window === 'undefined') {
    return StudentProfileDataSchema.parse(emptyLocalProfile()) as Record<string, unknown>;
  }
  try {
    const stored =
      window.localStorage.getItem(PROFILE_STORAGE_KEY) ??
      window.localStorage.getItem('mockProfileData');
    const parsed = StudentProfileDataSchema.safeParse(
      stored ? { ...emptyLocalProfile(), ...(JSON.parse(stored) as object) } : emptyLocalProfile(),
    );
    return (
      parsed.success ? parsed.data : StudentProfileDataSchema.parse(emptyLocalProfile())
    ) as Record<string, unknown>;
  } catch {
    return StudentProfileDataSchema.parse(emptyLocalProfile()) as Record<string, unknown>;
  }
}

function writeLocalProfile(profile: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function profileCompletion(profile: Record<string, unknown>): number {
  const basic = profile.basicInfo as Record<string, unknown> | undefined;
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const preferences = Array.isArray(profile.preferences) ? profile.preferences : [];
  const complete = Boolean(
    profile.dpdpConsent &&
    basic?.firstName &&
    basic?.lastName &&
    basic?.phoneNumber &&
    basic?.linkedinUrl &&
    skills.some((skill) => (skill as { type?: string }).type === 'language') &&
    preferences.length > 0,
  );
  return complete ? 100 : 0;
}

function localProfileResponse(profile: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({
      profile,
      profileCompletion: profileCompletion(profile),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function handleLocalProfile(init?: RequestInit): Response {
  let profile = readLocalProfile();
  if ((init?.method === 'PATCH' || init?.method === 'PUT') && init.body) {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    profile = { ...profile, ...body };
    writeLocalProfile(profile);
  }
  return localProfileResponse(profile);
}

const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input.toString();

  if (url.includes('/auth/login') && init?.method === 'POST') {
    return new Response(
      JSON.stringify({
        accessToken: 'mock_access_token',
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'student@example.com',
          fullName: 'Test Student',
          role: 'STUDENT',
          institutionId: null,
          institutionName: null,
          primaryTrack: null,
          secondaryTrack: null,
          provider: 'EMAIL',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/auth/sso/start') && init?.method === 'POST') {
    return new Response(
      JSON.stringify({
        authorizationUrl: 'http://localhost:3001/auth/callback?code=mock_code&state=mock_state',
        state: 'mock_state',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/auth/sso/callback') && init?.method === 'POST') {
    return new Response(
      JSON.stringify({
        accessToken: 'mock_access_token',
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'student@example.com',
          fullName: 'Test Student',
          role: 'STUDENT',
          institutionId: null, // Null to force institution picker
          institutionName: null,
          primaryTrack: null, // Null to trigger track enrollment
          secondaryTrack: null,
          provider: 'GOOGLE',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/users/me/profile')) {
    return handleLocalProfile(init);
  }

  if (url.includes('/users/me') && (!init || init.method === 'GET')) {
    return new Response(
      JSON.stringify({
        userId: '123e4567-e89b-12d3-a456-426614174000',
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
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/users/me/track') && init?.method === 'PUT') {
    return new Response(
      JSON.stringify({
        userId: '123e4567-e89b-12d3-a456-426614174000',
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
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/institutions') && (!init || init.method === 'GET')) {
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

  // eslint-disable-next-line no-restricted-globals
  return fetch(input, init);
};

const smartFetchImpl: typeof fetch = async (input, init) => {
  const url = input.toString();

  if (url.includes('/users/me/profile') && !IS_MOCK_ENV) {
    try {
      const response = await fetch(input, init);
      if (response.ok) {
        const clone = response.clone();
        try {
          const json = (await clone.json()) as { profile?: Record<string, unknown> };
          if (json.profile) writeLocalProfile(json.profile);
        } catch {
          /* response already returned below */
        }
        return response;
      }
      if (response.status === 401) return response;
    } catch {
      /* API unreachable — keep the candidate's profile locally */
    }
    return handleLocalProfile(init);
  }

  if (IS_MOCK_ENV) return mockFetch(input, init);
  return fetch(input, init);
};

export const smartFetch = smartFetchImpl;

export const apiClient = new SmartApiClient({
  baseUrl,
  fetchImpl: smartFetchImpl,
  getAccessToken: () => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem('smart.accessToken');
  },
  onUnauthorized: () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem('smart.accessToken');
    if (
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/activate')
    ) {
      window.location.assign('/login');
    }
  },
});

export const api = createSmartApi(apiClient);

export const mockQueueSkillVerification = async (skillId: string) => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};
