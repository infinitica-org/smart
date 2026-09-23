import {
  API_PREFIX,
  JobOpeningDtoSchema,
  ListJobOpeningsResponseSchema,
  CompanyDtoSchema,
  CandidateMatchDtoSchema,
  z,
  type CreateJobOpeningRequest,
  type ListJobOpeningsQuery,
  type CandidateMatchDto,
  type JobOpeningDto,
  type CompanyDto,
} from '@smart/contracts';
import {
  SmartApiClient,
  clearAccessToken,
  createRefreshAccessToken,
  createSmartApi,
  getAccessToken,
  isSmartApiError,
} from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
  onUnauthorized: () => {
    clearAccessToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  },
});

export const api = createSmartApi(apiClient);

export const companyJobsApi = {
  list: (query?: ListJobOpeningsQuery) =>
    apiClient.get(`${API_PREFIX}/placement/openings`, {
      schema: ListJobOpeningsResponseSchema,
      query,
    }),
  get: (openingId: string) =>
    apiClient.get(`${API_PREFIX}/placement/openings/${openingId}`, {
      schema: JobOpeningDtoSchema,
    }),
  create: (body: CreateJobOpeningRequest) =>
    apiClient.post(`${API_PREFIX}/placement/openings`, body, {
      schema: JobOpeningDtoSchema,
    }),
  update: (openingId: string, body: Partial<CreateJobOpeningRequest>) =>
    apiClient.request({
      method: 'PATCH',
      path: `${API_PREFIX}/placement/openings/${openingId}`,
      body,
      schema: JobOpeningDtoSchema,
    }),
  delete: (openingId: string) =>
    apiClient.request<void>({
      method: 'DELETE',
      path: `${API_PREFIX}/placement/openings/${openingId}`,
    }),
};

export const companyStudentsApi = {
  search: (
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<CandidateMatchDto[]> =>
    apiClient
      .get(`${API_PREFIX}/placement/students/search`, {
        schema: z.array(CandidateMatchDtoSchema),
        query,
      })
      .catch(() => [] as CandidateMatchDto[]),
};

export function formatApiError(error: unknown, fallback = 'Operation failed'): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((d) => d.message).join('. ');
  }
  if (isSmartApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
