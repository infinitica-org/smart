import type {
  AddCertificateSkillsRequest,
  AuditLogSection,
  CreateCompanyRequest,
  CreateInstitutionRequestSchema,
  CompleteCandidateOnboardingRequest,
  CreateCandidateCertificateRequest,
  CreateCertificateEndorsementRequest,
  CreateProjectRequest,
  DeclareSkillClaimRequest,
  FetchGithubProfileRequest,
  GithubRepoReadmeRequest,
  ListCompaniesQuery,
  ListInstitutionStudentsQuery,
  ListInstitutionsQuery,
  ListGithubReposRequest,
  ParseResumeRequest,
  RepoLanguagesRequest,
  SaveCandidateOnboardingDraftRequest,
  SetFeatureFlagOverrideRequest,
  SubmitCertificateEndorsementDecisionRequest,
  TenantActionReason,
  UpdateCertificateLearningRequest,
  UpdateCompanyRequest,
  UpdateInstitutionRequest,
  UpdatePlanCapacityRequest,
  UpdatePlanEntitlementsRequest,
  ViewCandidateRequest,
  ResolveVerificationRequest,
  ResolveIntegrityRequest,
  SaveDraftRequest,
  StartAttemptRequest,
  CompleteSkillVerifyRequest,
  SaveSkillVerifyRequest,
  StartSkillVerifyRequest,
  RunSdeSkillFormCodeRequest,
  ReserveUsernameRequest,
  UpdateProfileVisibilityRequest,
  CreateCandidateEducationDto,
  UpdateCandidateEducationDto,
  CreateCandidateLanguageDto,
  UpdateCandidateLanguageDto,
  CreateBlockedWordRequest,
  VoidRequest,
} from '@smart/contracts';
import {
  API_PREFIX,
  AdminDashboardDtoSchema,
  AiHealthDtoSchema,
  AttemptSessionDtoSchema,
  BlobWsPayloadSchema,
  CompleteAttemptResponseSchema,
  CompleteSkillVerifyResponseSchema,
  AuditLogDtoSchema,
  AuthTokenResponseSchema,
  AuthenticatedUserSchema,
  BatchDtoSchema,
  BatchMemberDtoSchema,
  CandidateBriefDtoSchema,
  CandidateCertificateDtoSchema,
  CandidateEducationSchema,
  CandidateLanguageSchema,
  CandidateOnboardingProfileResponseSchema,
  CertificateDtoSchema,
  CompanyDtoSchema,
  FetchGithubProfileResponseSchema,
  GetCertificateEndorsementResponseSchema,
  GithubRepoReadmeResponseSchema,
  GlobalStudentHitDtoSchema,
  InstitutionAdminDtoSchema,
  InstitutionDtoSchema,
  PlatformAdminDtoSchema,
  InstitutionStudentDtoSchema,
  IntegrityQueueItemDtoSchema,
  InvitationDtoSchema,
  InvitationPreviewDtoSchema,
  JobAcceptedSchema,
  LinkedinOauthUrlResponseSchema,
  ListCertificateVerificationEventsResponseSchema,
  ListGithubReposResponseSchema,
  ListMyApplicationsResponseSchema,
  ListMyCandidateCertificatesResponseSchema,
  ListMyProjectsResponseSchema,
  ListNotificationsResponseSchema,
  NextItemDtoSchema,
  NotificationDtoSchema,
  SubmitCertificateEndorsementDecisionResponseSchema,
  PublicCandidateProfileDtoSchema,
  PublicProfileLinkResponseSchema,
  PublicVerificationDtoSchema,
  RepoLanguagesResponseSchema,
  SandboxResultDtoSchema,
  SendBatchInvitesResultDtoSchema,
  SkillClaimDtoSchema,
  SkillLibraryResponseSchema,
  SkillVerifyPrepareDtoSchema,
  SkillVerifySessionDtoSchema,
  SsoStartResponseSchema,
  StudentInviteLinkResponseSchema,
  SubscriptionPlanDtoSchema,
  TenantEntitlementsDtoSchema,
  TrackDtoSchema,
  VerificationQueueItemDtoSchema,
  HealthStatusSchema,
  ParseResumeResponseSchema,
  ProctoringEnrollResponseSchema,
  ProctoringLivenessResponseSchema,
  ProctoringNonceResponseSchema,
  ProctoringOnboardingStatusSchema,
  ProctoringPingResponseSchema,
  ProctoringPrecheckResponseSchema,
  ProctoringVoiceResponseSchema,
  ProctoringWarningSnapshotSchema,
  ProjectDtoSchema,
  SaveDraftResponseSchema,
  RunSdeSkillFormCodeResponseSchema,
  WorkExperienceSchema,
  WorkExperienceDocumentSchema,
  ValidateWorkExperienceProofResponseSchema,
  SendWorkExperienceVerificationResponseSchema,
  GetWorkExperienceVerificationResponseSchema,
  SubmitWorkExperienceVerificationResponseSchema,
  WorkExperienceOpsDashboardItemSchema,
  type CreateWorkExperienceDto,
  type UpdateWorkExperienceDto,
  type CreateWorkExperienceDocumentDto,
  type SubmitWorkExperienceVerificationDto,
  UsernameStatusResponseSchema,
  ProfileVisibilityResponseSchema,
  ListBlockedWordsResponseSchema,
  BlockedWordDtoSchema,
  VoidWorkExperienceResponseSchema,
  VoidCandidateCertificateResponseSchema,
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

    saveOnboarding: (body: SaveCandidateOnboardingDraftRequest) =>
      client.request({
        method: 'PUT',
        path: prefixed('/users/me/onboarding'),
        body,
        schema: CandidateOnboardingProfileResponseSchema,
      }),

    completeOnboarding: (body: CompleteCandidateOnboardingRequest) =>
      client.post(prefixed('/users/me/onboarding/complete'), body, {
        schema: AuthenticatedUserSchema,
      }),

    /** Begins "Sign in with LinkedIn" (OIDC) — open the returned URL to verify. */
    linkedinOauthUrl: () =>
      client.get(prefixed('/users/me/onboarding/linkedin/oauth-url'), {
        schema: LinkedinOauthUrlResponseSchema,
      }),

    fetchGithubProfile: (body: FetchGithubProfileRequest) =>
      client.post(prefixed('/users/me/onboarding/github/fetch-profile'), body, {
        schema: FetchGithubProfileResponseSchema,
      }),

    listGithubRepos: (body: ListGithubReposRequest) =>
      client.post(prefixed('/users/me/onboarding/github/list-repos'), body, {
        schema: ListGithubReposResponseSchema,
      }),

    githubRepoLanguages: (body: RepoLanguagesRequest) =>
      client.post(prefixed('/users/me/onboarding/github/repo-languages'), body, {
        schema: RepoLanguagesResponseSchema,
      }),

    githubRepoReadme: (body: GithubRepoReadmeRequest) =>
      client.post(prefixed('/users/me/github/repo-readme'), body, {
        schema: GithubRepoReadmeResponseSchema,
      }),

    getPublicProfileLink: () =>
      client.get(prefixed('/users/me/public-profile-link'), {
        schema: PublicProfileLinkResponseSchema,
      }),

    getMyPublicProfile: () =>
      client.get(prefixed('/users/me/public-profile'), {
        schema: PublicCandidateProfileDtoSchema,
      }),

    /** CN-T09 — reservation status only; never carries cooldown/failed-attempt state. */
    getUsernameStatus: () =>
      client.get(prefixed('/users/me/username'), {
        schema: UsernameStatusResponseSchema,
      }),

    reserveUsername: (body: ReserveUsernameRequest) =>
      client.request({
        method: 'PUT',
        path: prefixed('/users/me/username'),
        body,
        schema: UsernameStatusResponseSchema,
      }),

    getProfileVisibility: () =>
      client.get(prefixed('/users/me/visibility'), {
        schema: ProfileVisibilityResponseSchema,
      }),

    updateProfileVisibility: (body: UpdateProfileVisibilityRequest) =>
      client.request({
        method: 'PUT',
        path: prefixed('/users/me/visibility'),
        body,
        schema: ProfileVisibilityResponseSchema,
      }),

    listWorkExperiences: () =>
      client.get(prefixed('/users/me/work-experiences'), {
        schema: z.array(WorkExperienceSchema),
      }),

    listEducation: () =>
      client.get(prefixed('/users/me/education'), {
        schema: z.array(CandidateEducationSchema),
      }),

    getEducation: (id: string) =>
      client.get(prefixed(`/users/me/education/${id}`), {
        schema: CandidateEducationSchema,
      }),

    createEducation: (body: CreateCandidateEducationDto) =>
      client.post(prefixed('/users/me/education'), body, {
        schema: CandidateEducationSchema,
      }),

    updateEducation: (id: string, body: UpdateCandidateEducationDto) =>
      client.request({
        method: 'PUT',
        path: prefixed(`/users/me/education/${id}`),
        body,
        schema: CandidateEducationSchema,
      }),

    deleteEducation: (id: string) => client.delete<void>(prefixed(`/users/me/education/${id}`)),

    listLanguages: () =>
      client.get(prefixed('/users/me/languages'), {
        schema: z.array(CandidateLanguageSchema),
      }),

    getLanguage: (id: string) =>
      client.get(prefixed(`/users/me/languages/${id}`), {
        schema: CandidateLanguageSchema,
      }),

    createLanguage: (body: CreateCandidateLanguageDto) =>
      client.post(prefixed('/users/me/languages'), body, {
        schema: CandidateLanguageSchema,
      }),

    updateLanguage: (id: string, body: UpdateCandidateLanguageDto) =>
      client.request({
        method: 'PUT',
        path: prefixed(`/users/me/languages/${id}`),
        body,
        schema: CandidateLanguageSchema,
      }),

    deleteLanguage: (id: string) => client.delete<void>(prefixed(`/users/me/languages/${id}`)),

    getWorkExperience: (id: string) =>
      client.get(prefixed(`/users/me/work-experiences/${id}`), {
        schema: WorkExperienceSchema,
      }),

    createWorkExperience: (body: CreateWorkExperienceDto) =>
      client.post(prefixed('/users/me/work-experiences'), body, {
        schema: WorkExperienceSchema,
      }),

    updateWorkExperience: (id: string, body: UpdateWorkExperienceDto) =>
      client.request({
        method: 'PUT',
        path: prefixed(`/users/me/work-experiences/${id}`),
        body,
        schema: WorkExperienceSchema,
      }),

    deleteWorkExperience: (id: string) =>
      client.delete<void>(prefixed(`/users/me/work-experiences/${id}`)),

    attachWorkExperienceDocument: (id: string, body: CreateWorkExperienceDocumentDto) =>
      client.post(prefixed(`/users/me/work-experiences/${id}/documents`), body, {
        schema: WorkExperienceDocumentSchema,
      }),

    removeWorkExperienceDocument: (id: string, documentId: string) =>
      client.delete<void>(prefixed(`/users/me/work-experiences/${id}/documents/${documentId}`)),

    validateWorkExperienceProof: (id: string, documentId: string, rawText?: string) =>
      client.post(
        prefixed(`/users/me/work-experiences/${id}/documents/${documentId}/validate`),
        rawText ? { rawText } : {},
        {
          schema: ValidateWorkExperienceProofResponseSchema,
        },
      ),

    sendWorkExperienceVerification: (id: string) =>
      client.post(
        prefixed(`/users/me/work-experiences/${id}/send-verification`),
        {},
        {
          schema: SendWorkExperienceVerificationResponseSchema,
        },
      ),

    restartWorkExperienceVerification: (id: string) =>
      client.post(
        prefixed(`/users/me/work-experiences/${id}/restart-verification`),
        {},
        {
          schema: SendWorkExperienceVerificationResponseSchema,
        },
      ),

    getWorkExperienceOpsDashboard: () =>
      client.get(prefixed('/users/me/work-experiences/ops-dashboard'), {
        schema: z.array(WorkExperienceOpsDashboardItemSchema),
      }),

    getWorkExperienceVerificationByToken: (token: string) =>
      client.get(prefixed(`/users/work-experiences/verify-token/${token}`), {
        schema: GetWorkExperienceVerificationResponseSchema,
        anonymous: true,
      }),

    submitWorkExperienceVerificationByToken: (
      token: string,
      body: SubmitWorkExperienceVerificationDto,
    ) =>
      client.post(prefixed(`/users/work-experiences/verify-token/${token}`), body, {
        schema: SubmitWorkExperienceVerificationResponseSchema,
        anonymous: true,
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

    updatePlanCapacity: (planId: string, body: UpdatePlanCapacityRequest) =>
      client.patch(prefixed(`/admin/plans/${planId}/capacity`), body, {
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

    companyEntitlements: (companyId: string) =>
      client.get(prefixed(`/admin/companies/${companyId}/entitlements`), {
        schema: TenantEntitlementsDtoSchema,
      }),

    setCompanyFlag: (companyId: string, body: SetFeatureFlagOverrideRequest) =>
      client.request({
        method: 'PUT',
        path: prefixed(`/admin/companies/${companyId}/feature-flags`),
        body,
        schema: TenantEntitlementsDtoSchema,
      }),

    tpoEntitlements: () =>
      client.get(prefixed('/tpo/entitlements'), { schema: TenantEntitlementsDtoSchema }),

    studentEntitlements: () =>
      client.get(prefixed('/student/entitlements'), { schema: TenantEntitlementsDtoSchema }),

    dashboard: () => client.get(prefixed('/admin/dashboard'), { schema: AdminDashboardDtoSchema }),

    listAuditLogs: (query?: {
      q?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      section?: AuditLogSection;
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

    /** CN-T09 — super-admin-curated blocked-word list. */
    listBlockedWords: () =>
      client.get(prefixed('/admin/blocked-words'), {
        schema: ListBlockedWordsResponseSchema,
      }),

    createBlockedWord: (body: CreateBlockedWordRequest) =>
      client.post(prefixed('/admin/blocked-words'), body, {
        schema: BlockedWordDtoSchema,
      }),

    removeBlockedWord: (id: string) => client.delete<void>(prefixed(`/admin/blocked-words/${id}`)),

    /** SA-T08 — one-directional; there is no "un-void". */
    voidCandidateCertificate: (id: string, body: VoidRequest) =>
      client.post(prefixed(`/admin/candidate-certificates/${id}/void`), body, {
        schema: VoidCandidateCertificateResponseSchema,
      }),

    voidWorkExperience: (id: string, body: VoidRequest) =>
      client.post(prefixed(`/admin/work-experience/${id}/void`), body, {
        schema: VoidWorkExperienceResponseSchema,
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

    /** Mints a fresh invite link to copy and share offline — never emailed, never displayed. */
    getStudentInviteLink: (userId: string) =>
      client.post(prefixed(`/tpo/students/${userId}/invite-link`), undefined, {
        schema: StudentInviteLinkResponseSchema,
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

    listPlatformAdmins: () =>
      client.get(prefixed('/admin/platform-admins'), {
        schema: z.array(PlatformAdminDtoSchema),
      }),

    invitePlatformAdmin: (body: { fullName: string; email: string; reason: string }) =>
      client.post(prefixed('/admin/platform-admins'), body, {
        schema: PlatformAdminDtoSchema,
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

    revokeStudentInvitation: (invitationId: string) =>
      client.post(prefixed(`/tpo/invitations/${invitationId}/revoke`), undefined, {
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

    skillLibrary: () =>
      client.get(prefixed('/catalog/skills'), {
        schema: SkillLibraryResponseSchema,
        anonymous: true,
      }),
  };
}

export function assessmentApi(client: SmartApiClient) {
  return {
    start: (body: StartAttemptRequest) =>
      client.post(prefixed('/assessment/start'), body, { schema: AttemptSessionDtoSchema }),

    listSkillClaims: () =>
      client.get(prefixed('/assessment/skill-claims'), {
        schema: z.array(SkillClaimDtoSchema),
      }),

    declareSkillClaim: (body: DeclareSkillClaimRequest) =>
      client.post(prefixed('/assessment/skill-claims'), body, {
        schema: SkillClaimDtoSchema,
      }),

    prepareSkillVerify: (claimId: string) =>
      client.post(
        prefixed(`/assessment/skill-claims/${claimId}/verify/start`),
        { prepareOnly: true } satisfies StartSkillVerifyRequest,
        { schema: SkillVerifyPrepareDtoSchema },
      ),

    startSkillVerify: (claimId: string, body?: StartSkillVerifyRequest) =>
      client.post(prefixed(`/assessment/skill-claims/${claimId}/verify/start`), body ?? {}, {
        schema: SkillVerifySessionDtoSchema,
        timeoutMs: 180_000,
      }),

    skillVerifySession: (sessionId: string) =>
      client.get(prefixed(`/assessment/skill-verify/${sessionId}`), {
        schema: SkillVerifySessionDtoSchema,
      }),

    saveSkillVerify: (sessionId: string, body: SaveSkillVerifyRequest) =>
      client.post(prefixed(`/assessment/skill-verify/${sessionId}/save`), body, {
        schema: SkillVerifySessionDtoSchema,
        timeoutMs: 5_000,
      }),

    completeSkillVerify: (sessionId: string, body: CompleteSkillVerifyRequest) =>
      client.post(prefixed(`/assessment/skill-verify/${sessionId}/complete`), body, {
        schema: CompleteSkillVerifyResponseSchema,
      }),

    /** Resume after a refresh, a dropped connection, or a closed laptop. */
    session: (attemptId: string) =>
      client.get(prefixed(`/assessment/${attemptId}/session`), {
        schema: AttemptSessionDtoSchema,
      }),

    nextItem: (attemptId: string, options?: { index?: number }) =>
      client.get(prefixed(`/assessment/${attemptId}/next-item`), {
        schema: NextItemDtoSchema,
        query: options?.index === undefined ? undefined : { index: options.index },
      }),

    /**
     * Answer drafts. Short timeout on purpose: this fires on every keystroke
     * pause, and a slow save must fail fast and retry rather than queue behind
     * itself while the candidate keeps typing.
     */
    saveAnswer: (body: SaveDraftRequest) =>
      client.post(prefixed('/assessment/submit-l1'), body, {
        schema: SaveDraftResponseSchema,
        timeoutMs: 5_000,
      }),

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
      client.post(prefixed('/assessment/complete'), body, {
        schema: CompleteAttemptResponseSchema,
      }),

    reportIntegrityEvent: (body: unknown) =>
      client
        .post<void>(prefixed('/assessment/integrity-event'), body, { timeoutMs: 3_000 })
        .catch(() => undefined),
  };
}

export function proctoringApi(client: SmartApiClient) {
  return {
    nonce: (attemptId: string) =>
      client.get(prefixed(`/proctoring/${attemptId}/nonce`), {
        schema: ProctoringNonceResponseSchema,
      }),
    snapshot: (attemptId: string) =>
      client.get(prefixed(`/proctoring/${attemptId}/snapshot`), {
        schema: ProctoringWarningSnapshotSchema,
      }),
    blob: (attemptId: string) =>
      client.get(prefixed(`/proctoring/${attemptId}/blob`), { schema: BlobWsPayloadSchema }),
    onboarding: (attemptId: string) =>
      client.get(prefixed(`/proctoring/${attemptId}/onboarding`), {
        schema: ProctoringOnboardingStatusSchema,
      }),
    ingest: (body: unknown) =>
      client.post(prefixed('/proctoring/violations'), body, {
        schema: ProctoringWarningSnapshotSchema,
      }),
    ping: (attemptId: string) =>
      client.post(
        prefixed('/proctoring/ping'),
        { attemptId },
        { schema: ProctoringPingResponseSchema },
      ),
    fingerprint: (body: unknown) => client.post(prefixed('/proctoring/fingerprint'), body),
    checkpoint: (body: unknown) => client.post(prefixed('/proctoring/checkpoint'), body),
    consent: (body: unknown) =>
      client.post(prefixed('/proctoring/consent'), body, {
        schema: ProctoringOnboardingStatusSchema,
      }),
    precheck: (body: unknown) =>
      client.post(prefixed('/proctoring/precheck'), body, {
        schema: ProctoringPrecheckResponseSchema,
      }),
    enrollFace: (attemptId: string) =>
      client.post(
        prefixed('/proctoring/enroll-face'),
        { attemptId },
        {
          schema: ProctoringEnrollResponseSchema,
        },
      ),
    liveness: (body: unknown) =>
      client.post(prefixed('/proctoring/liveness'), body, {
        schema: ProctoringLivenessResponseSchema,
      }),
    calibrateVoice: (body: unknown) =>
      client.post(prefixed('/proctoring/calibrate-voice'), body, {
        schema: ProctoringVoiceResponseSchema,
      }),
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
    listMine: () => client.get(prefixed('/projects'), { schema: ListMyProjectsResponseSchema }),

    create: (body: CreateProjectRequest) =>
      client.post(prefixed('/projects'), body, { schema: ProjectDtoSchema }),

    get: (projectId: string) =>
      client.get(prefixed(`/projects/${projectId}`), { schema: ProjectDtoSchema }),
  };
}

export function candidateCertificatesApi(client: SmartApiClient) {
  return {
    create: (body: CreateCandidateCertificateRequest) =>
      client.post(prefixed('/candidate-certificates'), body, {
        schema: CandidateCertificateDtoSchema,
      }),

    listMine: () =>
      client.get(prefixed('/candidate-certificates'), {
        schema: ListMyCandidateCertificatesResponseSchema,
      }),

    get: (id: string) =>
      client.get(prefixed(`/candidate-certificates/${id}`), {
        schema: CandidateCertificateDtoSchema,
      }),

    upload: (id: string, file: File | Blob, fileName: string) => {
      const formData = new FormData();
      formData.append('file', file, fileName);
      return client.postForm(prefixed(`/candidate-certificates/${id}/upload`), formData, {
        schema: CandidateCertificateDtoSchema,
      });
    },

    replaceSkills: (id: string, body: AddCertificateSkillsRequest) =>
      client.post(prefixed(`/candidate-certificates/${id}/skills`), body, {
        schema: CandidateCertificateDtoSchema,
      }),

    updateLearning: (id: string, body: UpdateCertificateLearningRequest) =>
      client.patch(prefixed(`/candidate-certificates/${id}`), body, {
        schema: CandidateCertificateDtoSchema,
      }),

    requestEndorsement: (id: string, body: CreateCertificateEndorsementRequest) =>
      client.post(prefixed(`/candidate-certificates/${id}/endorsement`), body, {
        schema: CandidateCertificateDtoSchema,
      }),

    listEvents: (id: string) =>
      client.get(prefixed(`/candidate-certificates/${id}/verification/events`), {
        schema: ListCertificateVerificationEventsResponseSchema,
      }),

    getEndorsement: (token: string) =>
      client.get(prefixed(`/certificate-endorsements/${token}`), {
        schema: GetCertificateEndorsementResponseSchema,
        anonymous: true,
      }),

    submitEndorsementDecision: (token: string, body: SubmitCertificateEndorsementDecisionRequest) =>
      client.post(prefixed(`/certificate-endorsements/${token}`), body, {
        schema: SubmitCertificateEndorsementDecisionResponseSchema,
        anonymous: true,
      }),
  };
}

export function notificationsApi(client: SmartApiClient) {
  return {
    list: () =>
      client.get(prefixed('/me/notifications'), { schema: ListNotificationsResponseSchema }),

    markRead: (notificationId: string) =>
      client.request({
        method: 'PATCH',
        path: prefixed(`/me/notifications/${notificationId}/read`),
        schema: NotificationDtoSchema,
      }),
  };
}

export function publicApi(client: SmartApiClient) {
  return {
    getCandidateProfile: (slug: string) =>
      client.get(prefixed(`/public/candidates/${slug}`), {
        schema: PublicCandidateProfileDtoSchema,
        anonymous: true,
      }),
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

export function evaluationApi(client: SmartApiClient) {
  return {
    runSkillFormCode: (body: RunSdeSkillFormCodeRequest) =>
      client.post(prefixed('/evaluation/skill-form/run-code'), body, {
        schema: RunSdeSkillFormCodeResponseSchema,
        timeoutMs: 60_000,
      }),
  };
}

export function createSmartApi(client: SmartApiClient) {
  return {
    auth: authApi(client),
    users: usersApi(client),
    catalog: catalogApi(client),
    assessment: assessmentApi(client),
    evaluation: evaluationApi(client),
    proctoring: proctoringApi(client),
    certificates: certificateApi(client),
    placement: placementApi(client),
    onboarding: onboardingApi(client),
    projects: projectsApi(client),
    candidateCertificates: candidateCertificatesApi(client),
    notifications: notificationsApi(client),
    public: publicApi(client),
    system: systemApi(client),
  };
}

export type SmartApi = ReturnType<typeof createSmartApi>;
