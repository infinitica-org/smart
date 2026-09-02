import type {
  CreateCompanyRequest,
  CreateInstitutionRequestSchema,
  CompleteCandidateOnboardingRequest,
  CreateProjectRequest,
  DeclareSkillClaimRequest,
  ListCompaniesQuery,
  ListInstitutionStudentsQuery,
  ListInstitutionsQuery,
  ParseResumeRequest,
  SetFeatureFlagOverrideRequest,
  TenantActionReason,
  UpdateCompanyRequest,
  UpdateInstitutionRequest,
  UpdatePlanEntitlementsRequest,
  ViewCandidateRequest,
  ResolveVerificationRequest,
  ResolveIntegrityRequest,
} from '@smart/contracts';
import {
  API_PREFIX,
  AdminDashboardDtoSchema,
  AiHealthDtoSchema,
  AssignedFormDtoSchema,
  AttemptSessionDtoSchema,
  AuditLogDtoSchema,
  AuthTokenResponseSchema,
  AuthenticatedUserSchema,
  BatchDtoSchema,
  BatchMemberDtoSchema,
  CandidateBriefDtoSchema,
  CandidateOnboardingProfileResponseSchema,
  CertificateDtoSchema,
  CompanyDtoSchema,
  GlobalStudentHitDtoSchema,
  InstitutionAdminDtoSchema,
  InstitutionDtoSchema,
  InstitutionStudentDtoSchema,
  IntegrityQueueItemDtoSchema,
  InvitationDtoSchema,
  InvitationPreviewDtoSchema,
  JobAcceptedSchema,
  ListMyApplicationsResponseSchema,
  NextItemDtoSchema,
  PublicVerificationDtoSchema,
  SandboxResultDtoSchema,
  SendBatchInvitesResultDtoSchema,
  SkillClaimDtoSchema,
  SsoStartResponseSchema,
  SubscriptionPlanDtoSchema,
  TenantEntitlementsDtoSchema,
  TrackDtoSchema,
  VerificationQueueItemDtoSchema,
  HealthStatusSchema,
  ParseResumeResponseSchema,
  ProjectDtoSchema,
} from '@smart/contracts';
import { z } from 'zod';
import type { SmartApiClient } from './client.js';

/**
 * Typed endpoint bindings.
 *
 * One function per route, each naming the contract schema its response is
 * validated against. This is where the frontend and the API meet: if a backend
 * owner changes a response shape without changing the contract, the failure lands
 * here with the route name in the message instead of as `undefined is not an
 * object` inside a component.
 *
 * Owner: Satheswaran V. Add a binding when its route lands, not before.
 */

const prefixed = (path: string): string => `${API_PREFIX}${path}`;

export function authApi(client: SmartApiClient) {
  return {
    login: (body: { email: string; password: string }) =>
      client.post(prefixed('/auth/login'), body, { schema: AuthTokenResponseSchema }),

    ssoStart: (body: { provider: string; institutionDomain?: string; redirectUri: string }) =>
      client.post(prefixed('/auth/sso/start'), body, { schema: SsoStartResponseSchema }),

    ssoCallback: (body: { code: string; state: string }) =>
      client.post(prefixed('/auth/sso/callback'), body, { schema: AuthTokenResponseSchema }),

    /**
     * Refresh sends no body: the refresh token is an HttpOnly cookie, so it is
     * never readable by JavaScript and never at risk from an XSS payload.
     */
    refresh: () =>
      client.post(prefixed('/auth/refresh'), undefined, {
        schema: AuthTokenResponseSchema,
        anonymous: true,
      }),

    logout: () => client.post<void>(prefixed('/auth/logout'), undefined, { anonymous: true }),

    me: () => client.get(prefixed('/users/me'), { schema: AuthenticatedUserSchema }),

    enrollTrack: (body: { trackCode: string; slot?: 'PRIMARY' | 'SECONDARY' }) =>
      client.request({
        method: 'PUT',
        path: prefixed('/users/me/track'),
        body,
        schema: AuthenticatedUserSchema,
      }),

    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      client.post<void>(prefixed('/users/me/password'), body),

    previewInvitation: (token: string) =>
      client.get(prefixed(`/auth/invitations/${token}`), {
        schema: InvitationPreviewDtoSchema,
        anonymous: true,
      }),

    acceptInvitation: (token: string, body: { password: string }) =>
      client.post(prefixed(`/auth/invitations/${token}/accept`), body, {
        schema: AuthTokenResponseSchema,
        anonymous: true,
      }),
  };
}

export function usersApi(client: SmartApiClient) {
  return {
    parseResume: (body: ParseResumeRequest) =>
      client.post(prefixed('/users/me/resume/parse'), body, {
        schema: ParseResumeResponseSchema,
      }),

    getOnboarding: () =>
      client.get(prefixed('/users/me/onboarding'), {
        schema: CandidateOnboardingProfileResponseSchema,
      }),

    completeOnboarding: (body: CompleteCandidateOnboardingRequest) =>
      client.post(prefixed('/users/me/onboarding/complete'), body, {
        schema: AuthenticatedUserSchema,
      }),
  };
}

export function onboardingApi(client: SmartApiClient) {
  return {
    createInstitution: (body: z.infer<typeof CreateInstitutionRequestSchema>) =>
      client.post(prefixed('/admin/institutions'), body, { schema: InstitutionDtoSchema }),

    listInstitutions: (query?: ListInstitutionsQuery) =>
      client.get(prefixed('/admin/institutions'), {
        schema: z.array(InstitutionDtoSchema),
        query,
      }),

    getInstitution: (institutionId: string) =>
      client.get(prefixed(`/admin/institutions/${institutionId}`), {
        schema: InstitutionDtoSchema,
      }),

    updateInstitution: (institutionId: string, body: UpdateInstitutionRequest) =>
      client.patch(prefixed(`/admin/institutions/${institutionId}`), body, {
        schema: InstitutionDtoSchema,
      }),

    holdInstitution: (institutionId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/institutions/${institutionId}/hold`), body, {
        schema: InstitutionDtoSchema,
      }),

    releaseHold: (institutionId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/institutions/${institutionId}/release-hold`), body, {
        schema: InstitutionDtoSchema,
      }),

    deactivateInstitution: (institutionId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/institutions/${institutionId}/deactivate`), body, {
        schema: InstitutionDtoSchema,
      }),

    restoreInstitution: (institutionId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/institutions/${institutionId}/restore`), body, {
        schema: InstitutionDtoSchema,
      }),

    listInstitutionStudents: (institutionId: string, query?: ListInstitutionStudentsQuery) =>
      client.get(prefixed(`/admin/institutions/${institutionId}/students`), {
        schema: z.array(InstitutionStudentDtoSchema),
        query,
      }),

    searchStudents: (q: string) =>
      client.get(prefixed('/admin/students/search'), {
        schema: z.array(GlobalStudentHitDtoSchema),
        query: { q },
      }),

    listPlans: () =>
      client.get(prefixed('/admin/plans'), { schema: z.array(SubscriptionPlanDtoSchema) }),

    updatePlanEntitlements: (planId: string, body: UpdatePlanEntitlementsRequest) =>
      client.patch(prefixed(`/admin/plans/${planId}/entitlements`), body, {
        schema: SubscriptionPlanDtoSchema,
      }),

    institutionEntitlements: (institutionId: string) =>
      client.get(prefixed(`/admin/institutions/${institutionId}/entitlements`), {
        schema: TenantEntitlementsDtoSchema,
      }),

    setInstitutionFlag: (institutionId: string, body: SetFeatureFlagOverrideRequest) =>
      client.request({
        method: 'PUT',
        path: prefixed(`/admin/institutions/${institutionId}/feature-flags`),
        body,
        schema: TenantEntitlementsDtoSchema,
      }),

    tpoEntitlements: () =>
      client.get(prefixed('/tpo/entitlements'), { schema: TenantEntitlementsDtoSchema }),

    dashboard: () => client.get(prefixed('/admin/dashboard'), { schema: AdminDashboardDtoSchema }),

    listAuditLogs: (query?: {
      q?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
    }) =>
      client.get(prefixed('/admin/audit-logs'), {
        schema: z.array(AuditLogDtoSchema),
        query,
      }),

    viewCandidateProfile: (userId: string, body: ViewCandidateRequest) =>
      client.post(prefixed(`/admin/students/${userId}/profile`), body, {
        schema: CandidateBriefDtoSchema,
      }),

    createCompany: (body: CreateCompanyRequest) =>
      client.post(prefixed('/admin/companies'), body, { schema: CompanyDtoSchema }),

    listCompanies: (query?: ListCompaniesQuery) =>
      client.get(prefixed('/admin/companies'), {
        schema: z.array(CompanyDtoSchema),
        query,
      }),

    getCompany: (companyId: string) =>
      client.get(prefixed(`/admin/companies/${companyId}`), { schema: CompanyDtoSchema }),

    updateCompany: (companyId: string, body: UpdateCompanyRequest) =>
      client.patch(prefixed(`/admin/companies/${companyId}`), body, { schema: CompanyDtoSchema }),

    holdCompany: (companyId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/companies/${companyId}/hold`), body, {
        schema: CompanyDtoSchema,
      }),

    releaseCompanyHold: (companyId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/companies/${companyId}/release-hold`), body, {
        schema: CompanyDtoSchema,
      }),

    deactivateCompany: (companyId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/companies/${companyId}/deactivate`), body, {
        schema: CompanyDtoSchema,
      }),

    restoreCompany: (companyId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/companies/${companyId}/restore`), body, {
        schema: CompanyDtoSchema,
      }),

    verificationQueue: () =>
      client.get(prefixed('/admin/verification-queue'), {
        schema: z.array(VerificationQueueItemDtoSchema),
      }),

    resolveVerification: (tenantId: string, body: ResolveVerificationRequest) =>
      client.post(prefixed(`/admin/verification-queue/${tenantId}/resolve`), body, {
        schema: VerificationQueueItemDtoSchema,
      }),

    integrityQueue: () =>
      client.get(prefixed('/admin/integrity-queue'), {
        schema: z.array(IntegrityQueueItemDtoSchema),
      }),

    resolveIntegrity: (attemptId: string, body: ResolveIntegrityRequest) =>
      client.post(prefixed(`/admin/integrity-queue/${attemptId}/resolve`), body, {
        schema: IntegrityQueueItemDtoSchema,
      }),

    aiHealth: () => client.get(prefixed('/admin/ai-health'), { schema: AiHealthDtoSchema }),

    holdStudent: (userId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/students/${userId}/hold`), body, {
        schema: InstitutionStudentDtoSchema,
      }),

    releaseStudentHold: (userId: string, body: TenantActionReason) =>
      client.post(prefixed(`/admin/students/${userId}/release-hold`), body, {
        schema: InstitutionStudentDtoSchema,
      }),

    listTpoStudents: (query?: ListInstitutionStudentsQuery) =>
      client.get(prefixed('/tpo/students'), {
        schema: z.array(InstitutionStudentDtoSchema),
        query,
      }),

    holdTpoStudent: (userId: string, body: TenantActionReason) =>
      client.post(prefixed(`/tpo/students/${userId}/hold`), body, {
        schema: InstitutionStudentDtoSchema,
      }),

    releaseTpoStudentHold: (userId: string, body: TenantActionReason) =>
      client.post(prefixed(`/tpo/students/${userId}/release-hold`), body, {
        schema: InstitutionStudentDtoSchema,
      }),

    inviteInstitutionAdmin: (institutionId: string, body: { fullName: string; email: string }) =>
      client.post(prefixed(`/admin/institutions/${institutionId}/admins`), body, {
        schema: InstitutionAdminDtoSchema,
      }),

    listInstitutionAdmins: (institutionId: string) =>
      client.get(prefixed(`/admin/institutions/${institutionId}/admins`), {
        schema: z.array(InstitutionAdminDtoSchema),
      }),

    resendAdminInvitation: (invitationId: string) =>
      client.post(prefixed(`/admin/invitations/${invitationId}/resend`), undefined, {
        schema: InvitationDtoSchema,
      }),

    createBatch: (body: { name: string; code?: string }) =>
      client.post(prefixed('/tpo/batches'), body, { schema: BatchDtoSchema }),

    listBatches: () => client.get(prefixed('/tpo/batches'), { schema: z.array(BatchDtoSchema) }),

    getBatch: (batchId: string) =>
      client.get(prefixed(`/tpo/batches/${batchId}`), { schema: BatchDtoSchema }),

    updateBatch: (batchId: string, body: { name?: string; code?: string | null }) =>
      client.patch(prefixed(`/tpo/batches/${batchId}`), body, { schema: BatchDtoSchema }),

    addBatchMember: (
      batchId: string,
      body: { fullName: string; email: string; groupLabel?: string },
    ) =>
      client.post(prefixed(`/tpo/batches/${batchId}/members`), body, {
        schema: BatchMemberDtoSchema,
      }),

    listBatchMembers: (batchId: string) =>
      client.get(prefixed(`/tpo/batches/${batchId}/members`), {
        schema: z.array(BatchMemberDtoSchema),
      }),

    sendBatchInvites: (batchId: string) =>
      client.post(prefixed(`/tpo/batches/${batchId}/invites/send`), undefined, {
        schema: SendBatchInvitesResultDtoSchema,
      }),

    resendStudentInvitation: (invitationId: string) =>
      client.post(prefixed(`/tpo/invitations/${invitationId}/resend`), undefined, {
        schema: InvitationDtoSchema,
      }),
  };
}

export function catalogApi(client: SmartApiClient) {
  return {
    tracks: () =>
      client.get(prefixed('/catalog/tracks'), {
        schema: z.array(TrackDtoSchema),
        anonymous: true,
      }),

    track: (trackCode: string) =>
      client.get(prefixed(`/catalog/tracks/${trackCode}`), {
        schema: TrackDtoSchema,
        anonymous: true,
      }),
  };
}

export function assessmentApi(client: SmartApiClient) {
  return {
    start: (body: { trackCode: string; levelNumber: number }) =>
      client.post(prefixed('/assessment/start'), body, { schema: AssignedFormDtoSchema }),

    listSkillClaims: () =>
      client.get(prefixed('/assessment/skill-claims'), {
        schema: z.array(SkillClaimDtoSchema),
      }),

    declareSkillClaim: (body: DeclareSkillClaimRequest) =>
      client.post(prefixed('/assessment/skill-claims'), body, {
        schema: SkillClaimDtoSchema,
      }),

    /** Resume after a refresh, a dropped connection, or a closed laptop. */
    session: (attemptId: string) =>
      client.get(prefixed(`/assessment/${attemptId}/session`), {
        schema: AttemptSessionDtoSchema,
      }),

    nextItem: (attemptId: string) =>
      client.get(prefixed(`/assessment/${attemptId}/next-item`), { schema: NextItemDtoSchema }),

    /**
     * Answer drafts. Short timeout on purpose: this fires on every keystroke
     * pause, and a slow save must fail fast and retry rather than queue behind
     * itself while the candidate keeps typing.
     */
    saveAnswer: (body: unknown) =>
      client.post<void>(prefixed('/assessment/submit-l1'), body, { timeoutMs: 5_000 }),

    compileCode: (body: unknown) =>
      client.post(prefixed('/assessment/compile-l2'), body, { schema: JobAcceptedSchema }),

    sandboxResult: (jobId: string) =>
      client.get(prefixed(`/assessment/sandbox/${jobId}`), { schema: SandboxResultDtoSchema }),

    requestAudioUploadUrl: (body: unknown) =>
      client.post(prefixed('/assessment/l3/upload-url'), body, {
        schema: z.object({
          uploadUrl: z.string(),
          objectKey: z.string(),
          expiresInSeconds: z.number(),
        }),
      }),

    complete: (body: { attemptId: string }) =>
      client.post(prefixed('/assessment/complete'), body, { schema: JobAcceptedSchema }),

    /**
     * Integrity telemetry. Fire-and-forget by design: a candidate's assessment
     * must never break because an advisory signal failed to send.
     */
    reportIntegrityEvent: (body: unknown) =>
      client
        .post<void>(prefixed('/assessment/integrity-event'), body, { timeoutMs: 3_000 })
        .catch(() => undefined),
  };
}

export function certificateApi(client: SmartApiClient) {
  return {
    mine: () =>
      client.get(prefixed('/certificates/mine'), { schema: z.array(CertificateDtoSchema) }),

    setVisibility: (certificateId: string, isPublic: boolean) =>
      client.patch(
        prefixed(`/certificates/${certificateId}/visibility`),
        { isPublic },
        {
          schema: CertificateDtoSchema,
        },
      ),

    pdfUrl: (certificateId: string) =>
      client.get(prefixed(`/certificates/${certificateId}/pdf`), {
        schema: z.object({ url: z.string(), expiresInSeconds: z.number() }),
      }),

    /**
     * Public verification. Anonymous, and the only endpoint an employer hits
     * without an account — so it must never send an Authorization header that
     * would make it look like an authenticated request in the logs.
     */
    verify: (certificateId: string) =>
      client.get(prefixed(`/verify/${certificateId}`), {
        schema: PublicVerificationDtoSchema,
        anonymous: true,
      }),
  };
}

export function placementApi(client: SmartApiClient) {
  return {
    ingestJd: (body: unknown) =>
      client.post(prefixed('/placement/ingest-jd'), body, { schema: JobAcceptedSchema }),

    match: (body: unknown) =>
      client.post(prefixed('/placement/match'), body, { schema: JobAcceptedSchema }),

    /** Reporting route: a longer timeout than the interactive default. */
    shortlist: (query: Record<string, string | number | boolean | undefined>) =>
      client.get(prefixed('/tpo/shortlist'), { query, timeoutMs: 30_000 }),

    recordOutcome: (body: unknown) => client.post<void>(prefixed('/placement/outcomes'), body),

    /** Candidate My Applications. Identity is the access token; no studentId query. */
    listMyApplications: () =>
      client.get(prefixed('/me/applications'), { schema: ListMyApplicationsResponseSchema }),
  };
}

export function projectsApi(client: SmartApiClient) {
  return {
    create: (body: CreateProjectRequest) =>
      client.post(prefixed('/projects'), body, { schema: ProjectDtoSchema }),

    get: (projectId: string) =>
      client.get(prefixed(`/projects/${projectId}`), { schema: ProjectDtoSchema }),
  };
}

export function systemApi(client: SmartApiClient) {
  return {
    health: () =>
      client.get('/health', {
        schema: HealthStatusSchema,
        anonymous: true,
      }),
  };
}

export function createSmartApi(client: SmartApiClient) {
  return {
    auth: authApi(client),
    users: usersApi(client),
    catalog: catalogApi(client),
    assessment: assessmentApi(client),
    certificates: certificateApi(client),
    placement: placementApi(client),
    onboarding: onboardingApi(client),
    projects: projectsApi(client),
    system: systemApi(client),
  };
}

export type SmartApi = ReturnType<typeof createSmartApi>;
