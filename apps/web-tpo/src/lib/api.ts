import {
  SmartApiClient,
  createRefreshAccessToken,
  createSmartApi,
  getAccessToken,
} from '@smart/api-client';
import {
  API_PREFIX,
  ApplicationConfidenceDtoSchema,
  ApplicationDtoSchema,
  JobOpeningDtoSchema,
  ListApplicationsResponseSchema,
  ShortlistDtoSchema,
  type AtsStage,
  type AuthTokenResponse,
  type AuthenticatedUser,
  type BatchDto,
  type CreateApplicationRequest,
  type CreateJobOpeningRequest,
  type ListJobOpeningsQuery,
  type ListJobOpeningsResponse,
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
const mockUser: AuthenticatedUser = {
  userId: 'mock-user-123',
  email: 'admin@college.edu',
  fullName: 'Mock Admin',
  role: 'INSTITUTION_ADMIN',
  institutionId: 'inst-123',
  institutionName: 'Mock College',
  primaryTrack: null,
  secondaryTrack: null,
  provider: 'PASSWORD',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  onboardingCompleted: true,
  sessionHold: null,
};

const mockAuthToken: AuthTokenResponse = {
  accessToken: 'mock-token-123',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  user: mockUser,
};

api.auth.login = async (): Promise<AuthTokenResponse> => mockAuthToken;
api.auth.me = async (): Promise<AuthenticatedUser> => mockUser;
// -------------------
api.auth.refresh = async (): Promise<AuthTokenResponse> => mockAuthToken;

api.onboarding.listBatches = async (): Promise<BatchDto[]> => [];
// -------------------

export const openingsApi = {
  create: (body: CreateJobOpeningRequest) =>
    apiClient.post(`${API_PREFIX}/placement/openings`, body, { schema: JobOpeningDtoSchema }),
  list: async (_query?: ListJobOpeningsQuery): Promise<ListJobOpeningsResponse> => ({
    openings: [],
  }),
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
  getConfidence: (applicationId: string) =>
    apiClient.get(`${API_PREFIX}/placement/applications/${applicationId}/confidence`, {
      schema: ApplicationConfidenceDtoSchema,
    }),
  sendToCompany: (applicationId: string) =>
    apiClient.post(
      `${API_PREFIX}/placement/applications/${applicationId}/send-to-company`,
      undefined,
      { schema: ApplicationDtoSchema },
    ),
};
