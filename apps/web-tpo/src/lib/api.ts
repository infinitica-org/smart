import {
  SmartApiClient,
  createRefreshAccessToken,
  createSmartApi,
  getAccessToken,
} from '@smart/api-client';
import {
  API_PREFIX,
  ApplicationDtoSchema,
  JobOpeningDtoSchema,
  ListApplicationsResponseSchema,
  ListJobOpeningsResponseSchema,
  ShortlistDtoSchema,
  type AtsStage,
  type CreateApplicationRequest,
  type CreateJobOpeningRequest,
  type ListJobOpeningsQuery,
  type MatchRequest,
} from '@smart/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://dev.api.becomesmart.online';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
});

export const api = createSmartApi(apiClient);

// --- MOCK BYPASS ---
api.auth.login = async () =>
  ({
    accessToken: 'mock-token-123',
    user: { role: 'INSTITUTION_ADMIN' },
  }) as any;

api.auth.me = async () =>
  ({
    userId: 'mock-user-123',
    email: 'admin@college.edu',
    fullName: 'Mock Admin',
    role: 'INSTITUTION_ADMIN',
    institutionId: 'inst-123',
    institutionName: 'Mock College',
    primaryTrack: null,
    secondaryTrack: null,
    provider: 'EMAIL',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    onboardingCompleted: true,
    sessionHold: null,
  }) as any;
// -------------------
api.auth.refresh = async () =>
  ({
    accessToken: 'mock-token-123',
    user: { role: 'INSTITUTION_ADMIN' },
  }) as any;

api.onboarding.listBatches = async () => [] as any;
// -------------------

export const openingsApi = {
  create: (body: CreateJobOpeningRequest) =>
    apiClient.post(`${API_PREFIX}/placement/openings`, body, { schema: JobOpeningDtoSchema }),
  list: async (query?: ListJobOpeningsQuery) => ({ openings: [] }) as any,
  get: (openingId: string) =>
    apiClient.get(`${API_PREFIX}/placement/openings/${openingId}`, {
      schema: JobOpeningDtoSchema,
    }),
};

export const matchingApi = {
  match: (body: MatchRequest) =>
    apiClient.post(`${API_PREFIX}/placement/match`, body, {
      schema: ShortlistDtoSchema,
    }),
};

export const applicationsApi = {
  create: (body: CreateApplicationRequest) =>
    apiClient.post(`${API_PREFIX}/placement/applications`, body, {
      schema: ApplicationDtoSchema,
    }),
  listForOpening: (openingId: string) =>
    apiClient.get(`${API_PREFIX}/placement/openings/${openingId}/applications`, {
      schema: ListApplicationsResponseSchema,
    }),
  patchStage: (applicationId: string, stage: AtsStage) =>
    apiClient.patch(
      `${API_PREFIX}/placement/applications/${applicationId}/stage`,
      { stage },
      {
        schema: ApplicationDtoSchema,
      },
    ),
};
