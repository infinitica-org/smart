import {
  API_PREFIX,
  JobOpeningDtoSchema,
  ListJobOpeningsResponseSchema,
  CandidateMatchDtoSchema,
  ListSavedCandidatesResponseSchema,
  SavedCandidateDtoSchema,
  MatchFeedbackResponseSchema,
  z,
  type CreateJobOpeningRequest,
  type ListJobOpeningsQuery,
  type CandidateMatchDto,
  type SubmitMatchFeedbackRequest,
  type ListSavedCandidatesResponse,
  type SavedCandidateDto,
  type MatchFeedbackResponse,
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
  list: async (query?: ListJobOpeningsQuery) => {
    try {
      return await apiClient.get(`${API_PREFIX}/placement/openings`, {
        schema: ListJobOpeningsResponseSchema,
        query,
      });
    } catch {
      return { openings: [], total: 0 };
    }
  },
  get: async (openingId: string) => {
    try {
      return await apiClient.get(`${API_PREFIX}/placement/openings/${openingId}`, {
        schema: JobOpeningDtoSchema,
      });
    } catch {
      return null;
    }
  },
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

export const companySavedCandidatesApi = {
  list: (): Promise<ListSavedCandidatesResponse> =>
    apiClient
      .get(`${API_PREFIX}/placement/saved-candidates`, {
        schema: ListSavedCandidatesResponseSchema,
      })
      .catch(() => ({ savedCandidates: [], total: 0 })),
  save: (studentId: string, openingId?: string, note?: string): Promise<SavedCandidateDto | null> =>
    apiClient
      .post(
        `${API_PREFIX}/placement/saved-candidates`,
        { studentId, openingId, note },
        { schema: SavedCandidateDtoSchema },
      )
      .catch(() => null),
  remove: (studentId: string): Promise<{ success: boolean }> =>
    apiClient
      .request<{ success: boolean }>({
        method: 'DELETE',
        path: `${API_PREFIX}/placement/saved-candidates/${studentId}`,
      })
      .catch(() => ({ success: false })),
};

export const companyFeedbackApi = {
  submitEmployerFeedback: (
    body: SubmitMatchFeedbackRequest,
  ): Promise<MatchFeedbackResponse | null> =>
    apiClient
      .post(`${API_PREFIX}/placement/feedback/employer`, body, {
        schema: MatchFeedbackResponseSchema,
      })
      .catch(() => null),
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
