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
  ListJobOpeningsResponseSchema,
  ShortlistDtoSchema,
  type CreateApplicationRequest,
  type CreateJobOpeningRequest,
  type ListJobOpeningsQuery,
  type MatchRequest,
} from '@smart/contracts';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
});

export const api = createSmartApi(apiClient);

export const openingsApi = {
  create: (body: CreateJobOpeningRequest) =>
    apiClient.post(`${API_PREFIX}/placement/openings`, body, { schema: JobOpeningDtoSchema }),
  list: (query?: ListJobOpeningsQuery) =>
    apiClient.get(`${API_PREFIX}/placement/openings`, {
      schema: ListJobOpeningsResponseSchema,
      query,
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
};
