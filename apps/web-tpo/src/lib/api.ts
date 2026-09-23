import {
  API_PREFIX,
  ApplicationConfidenceDtoSchema,
  ApplicationDtoSchema,
  CreateMatchRunResponseSchema,
  JobOpeningDtoSchema,
  ListApplicationsResponseSchema,
  ListJobOpeningsResponseSchema,
  ListPlacementEmployersResponseSchema,
  ListPlacementOutcomesResponseSchema,
  PlacementEmployerDetailSchema,
  PlacementEmployerSummarySchema,
  MatchRunDtoSchema,
  StaffMemberDtoSchema,
  InstitutionStudentDtoSchema,
  UploadJobOpeningDocumentResponseSchema,
  UploadJobOpeningLogoResponseSchema,
  ShortlistDtoSchema,
  z,
  type AtsStage,
  type CreateApplicationRequest,
  type CreateJobOpeningRequest,
  type CreatePlacementEmployerRequest,
  type InviteStaffRequest,
  type ListJobOpeningsQuery,
  type ListPlacementEmployersQuery,
  type RecordOutcomeRequest,
  type UpdatePlacementEmployerRequest,
  type MatchRequest,
  type StaffMemberDto,
  type InstitutionStudentDto,
  type StaffRole,
} from '@smart/contracts';
import {
  SmartApiClient,
  clearAccessToken,
  createRefreshAccessToken,
  createSmartApi,
  getAccessToken,
} from '@smart/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
// web-auth is the one login screen for every portal now.
const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3005';

export const apiClient = new SmartApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken: createRefreshAccessToken(() => api.auth.refresh()),
  // Every real page reads and writes through this one client — this is the
  // only place a failed refresh needs to send the user back to login.
  onUnauthorized: () => {
    clearAccessToken();
    window.location.href = `${authUrl}/login`;
  },
});

export const api = createSmartApi(apiClient);

export const employersApi = {
  list: (query?: ListPlacementEmployersQuery) =>
    apiClient.get(`${API_PREFIX}/placement/employers`, {
      schema: ListPlacementEmployersResponseSchema,
      query,
    }),
  get: (employerId: string) =>
    apiClient.get(`${API_PREFIX}/placement/employers/${employerId}`, {
      schema: PlacementEmployerDetailSchema,
    }),
  create: (body: CreatePlacementEmployerRequest) =>
    apiClient.post(`${API_PREFIX}/placement/employers`, body, {
      schema: PlacementEmployerSummarySchema,
    }),
  update: (employerId: string, body: UpdatePlacementEmployerRequest) =>
    apiClient.patch(`${API_PREFIX}/placement/employers/${employerId}`, body, {
      schema: PlacementEmployerSummarySchema,
    }),
};

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
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm(`${API_PREFIX}/placement/openings/logo/upload`, formData, {
      schema: UploadJobOpeningLogoResponseSchema,
    });
  },
  uploadDocument: (file: File, label?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (label?.trim()) formData.append('label', label.trim());
    return apiClient.postForm(`${API_PREFIX}/placement/openings/documents/upload`, formData, {
      schema: UploadJobOpeningDocumentResponseSchema,
    });
  },
};

export const matchingApi = {
  /** @deprecated use `createRun` + `getRun` (S6-VV-76) — kept for one release. */
  match: (body: MatchRequest) =>
    apiClient.post(`${API_PREFIX}/placement/match`, body, {
      schema: ShortlistDtoSchema,
    }),
  createRun: (body: MatchRequest) =>
    apiClient.post(`${API_PREFIX}/placement/match-runs`, body, {
      schema: CreateMatchRunResponseSchema,
    }),
  getRun: (runId: string) =>
    apiClient.get(`${API_PREFIX}/placement/match-runs/${runId}`, {
      schema: MatchRunDtoSchema,
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

export const placementOutcomesApi = {
  record: (body: RecordOutcomeRequest) => apiClient.post(`${API_PREFIX}/placement/outcomes`, body),
  listForCompany: (companyName: string) =>
    apiClient.get(`${API_PREFIX}/placement/outcomes`, {
      schema: ListPlacementOutcomesResponseSchema,
      query: { companyName },
    }),
};

export const staffApi = {
  list: (): Promise<StaffMemberDto[]> =>
    apiClient.get(`${API_PREFIX}/tpo/staff`, {
      schema: z.array(StaffMemberDtoSchema),
    }),
  invite: (body: InviteStaffRequest): Promise<StaffMemberDto> =>
    apiClient.post(`${API_PREFIX}/tpo/staff/invitations`, body, {
      schema: StaffMemberDtoSchema,
    }),
  updateRole: (userId: string, role: StaffRole): Promise<StaffMemberDto> =>
    apiClient.patch(
      `${API_PREFIX}/tpo/staff/${userId}/role`,
      { role },
      {
        schema: StaffMemberDtoSchema,
      },
    ),
  deactivateAccess: (userId: string): Promise<StaffMemberDto> =>
    apiClient.post(
      `${API_PREFIX}/tpo/staff/${userId}/deactivate`,
      {},
      {
        schema: StaffMemberDtoSchema,
      },
    ),
  updateCampus: (userId: string, campus: string | null): Promise<StaffMemberDto> =>
    apiClient.patch(
      `${API_PREFIX}/tpo/staff/${userId}/campus`,
      { campus },
      {
        schema: StaffMemberDtoSchema,
      },
    ),
  listAssignedStudents: (): Promise<InstitutionStudentDto[]> =>
    apiClient.get(`${API_PREFIX}/tpo/students/assigned-to-me`, {
      schema: z.array(InstitutionStudentDtoSchema),
    }),
};
