import { SmartApiClient, createSmartApi } from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const IS_MOCK_ENV = process.env.NEXT_PUBLIC_MOCK_API === 'true';

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
    let mockProfile: any = {
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      preferences: [],
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('mockProfileData');
        if (stored) {
          mockProfile = JSON.parse(stored);
        }
      } catch (e) {}
    }

    if (init?.method === 'PATCH' || init?.method === 'PUT') {
      if (init.body) {
        try {
          const body = JSON.parse(init.body as string);
          mockProfile = { ...mockProfile, ...body };
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('mockProfileData', JSON.stringify(mockProfile));
          }
        } catch (e) {}
      }
    }

    return new Response(
      JSON.stringify({
        profile: mockProfile,
        profileCompletion: mockProfile.dpdpConsent ? 100 : 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
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

export const smartFetch = IS_MOCK_ENV ? (mockFetch as typeof fetch) : fetch;

export const apiClient = new SmartApiClient({
  baseUrl,
  fetchImpl: IS_MOCK_ENV ? (mockFetch as typeof fetch) : undefined,
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
