import { z } from 'zod';
import {
  AuthProviderSchema,
  SessionHoldCodeSchema,
  TenantVerificationStatusSchema,
  TrackCodeSchema,
  UserRoleSchema,
} from '../domain/enums.js';
import { EmailSchema, IsoDateTimeSchema, UuidSchema } from './common.js';

/**
 * Identity & access contracts.
 * Implementation owner: Vishal V (`apps/api-core/src/modules/auth`).
 * Consumer: Satheswaran V (`packages/api-client`, web apps).
 */

/* ------------------------------- login flows ------------------------------ */

export const PasswordLoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(200),
});
export type PasswordLoginRequest = z.infer<typeof PasswordLoginRequestSchema>;

/* ---------------------------- self-serve register -------------------------- */

export const RegisterStudentRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: EmailSchema,
  password: z.string().min(8).max(200),
});
export type RegisterStudentRequest = z.infer<typeof RegisterStudentRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(200),
  fullName: z.string().trim().min(1).max(200),
  /** Selected from GET /auth/institutions — self-serve registration always joins an existing institution. */
  institutionId: UuidSchema,
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * Registration no longer signs the student in: a STUDENT can't sign in until the emailed link
 * is confirmed, so the response only says where the link went.
 */
export const RegisterResponseSchema = z.object({
  email: EmailSchema,
  verificationRequired: z.literal(true),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

/** Error code for a correct-password sign-in by a STUDENT whose email isn't verified yet. */
export const EMAIL_NOT_VERIFIED_ERROR = 'email_not_verified';

/** Public, because an unverified student can't sign in to ask. Always 204. */
export const ResendEmailVerificationRequestSchema = z.object({
  email: EmailSchema,
});
export type ResendEmailVerificationRequest = z.infer<typeof ResendEmailVerificationRequestSchema>;

export const SelectableInstitutionDtoSchema = z.object({
  id: UuidSchema,
  name: z.string(),
});
export type SelectableInstitutionDto = z.infer<typeof SelectableInstitutionDtoSchema>;

/* ---------------------------- password reset -------------------------- */

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmRequestSchema = z.object({
  newPassword: z.string().min(8).max(200),
});
export type PasswordResetConfirmRequest = z.infer<typeof PasswordResetConfirmRequestSchema>;

export const SsoStartRequestSchema = z.object({
  provider: AuthProviderSchema,
  /** Institutional email domain, e.g. `psgtech.ac.in`. Resolves the SAML/OIDC tenant. */
  institutionDomain: z.string().max(255).optional(),
  redirectUri: z.url(),
});
export type SsoStartRequest = z.infer<typeof SsoStartRequestSchema>;

export const SsoStartResponseSchema = z.object({
  authorizationUrl: z.url(),
  state: z.string(),
});
export type SsoStartResponse = z.infer<typeof SsoStartResponseSchema>;

/**
 * Only the 15-minute access token is returned in the body. The refresh token is
 * set as an HttpOnly, Secure, SameSite=Strict cookie and is never readable by
 * JavaScript — do not attempt to store it client-side.
 */
export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresInSeconds: z.number().int(),
  user: z.lazy(() => AuthenticatedUserSchema),
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

export const AuthenticatedUserSchema = z.object({
  userId: UuidSchema,
  email: EmailSchema,
  fullName: z.string(),
  role: UserRoleSchema,
  institutionId: UuidSchema.nullable(),
  institutionName: z.string().nullable(),
  /** B2B company tenant; null for students, TPO, and platform admins. */
  companyId: UuidSchema.nullable().optional(),
  companyName: z.string().nullable().optional(),
  primaryTrack: TrackCodeSchema.nullable(),
  secondaryTrack: TrackCodeSchema.nullable(),
  provider: AuthProviderSchema,
  emailVerified: z.boolean(),
  createdAt: IsoDateTimeSchema,
  /**
   * CN-T01 — server-side gate. Students must complete minimal onboarding
   * (interest domain + basic profile + DPDP consent) before /dashboard.
   * Non-students are always true. Career track enrollment is separate.
   */
  onboardingCompleted: z.boolean(),
  /** Signed download URL for the candidate profile photo, when uploaded. */
  profilePhotoUrl: z.string().url().nullable(),
  /** S6-VV-75 — CGPA (0-10) and 10th/12th percentages, set during onboarding or profile edit. */
  cgpa: z.number().min(0).max(10).nullable(),
  sscPercentage: z.number().min(0).max(100).nullable(),
  hscPercentage: z.number().min(0).max(100).nullable(),
  sessionHold: z
    .object({
      code: SessionHoldCodeSchema,
      message: z.string(),
    })
    .nullable(),
});
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

/** Tenant-safe company portal account (GET /auth/company/account). */
export const CompanyPortalAccountSchema = AuthenticatedUserSchema.extend({
  companyVerificationStatus: TenantVerificationStatusSchema,
  companyWebsite: z.string().nullable().optional(),
  companyIndustry: z.string().nullable().optional(),
  companyLocation: z.string().nullable().optional(),
});
export type CompanyPortalAccount = z.infer<typeof CompanyPortalAccountSchema>;

/* -------------------------------- JWT claims ------------------------------ */

/**
 * Access token claims. Guards validate these in memory with zero DB hits —
 * that is what makes 50k concurrent candidates affordable.
 */
export const AccessTokenClaimsSchema = z.object({
  sub: UuidSchema,
  role: UserRoleSchema,
  inst: UuidSchema.nullable(),
  /** Company tenant id when the user belongs to a B2B company (future auth phase). */
  cmp: UuidSchema.nullable().optional(),
  /** Track codes the user is enrolled on. */
  trk: z.array(TrackCodeSchema),
  /** Refresh-token family id, used for reuse detection on rotation. */
  fam: z.string(),
  iat: z.number().int(),
  exp: z.number().int(),
  iss: z.string(),
  aud: z.string(),
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(8).max(200),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

/* ------------------------------ track enrolment --------------------------- */

export const EnrollTrackRequestSchema = z.object({
  trackCode: TrackCodeSchema,
  slot: z.enum(['PRIMARY', 'SECONDARY']).default('PRIMARY'),
});
export type EnrollTrackRequest = z.infer<typeof EnrollTrackRequestSchema>;

/* ------------------------------- B2B API keys ----------------------------- */

export const CreateApiKeyRequestSchema = z.object({
  label: z.string().min(3).max(80),
  institutionId: UuidSchema.nullable(),
  /** Scopes are additive and least-privilege by default. */
  scopes: z
    .array(z.enum(['verify:read', 'placement:match', 'candidate:read', 'webhook:manage']))
    .min(1),
  expiresAt: IsoDateTimeSchema.nullable(),
});
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;

/**
 * The raw key is returned exactly once, at creation. It is stored hashed.
 */
export const CreateApiKeyResponseSchema = z.object({
  apiKeyId: UuidSchema,
  label: z.string(),
  /** Shown once. If it is lost, issue a new key — it cannot be recovered. */
  secret: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema.nullable(),
});
export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;

export const API_KEY_HEADER = 'x-smart-api-key' as const;

/* ------------------------------- role assignment -------------------------- */

export const AssignRoleRequestSchema = z.object({
  role: UserRoleSchema,
});
export type AssignRoleRequest = z.infer<typeof AssignRoleRequestSchema>;

/** Roles an admin can move an institution staff member between (#169). */
export const INSTITUTION_STAFF_ROLES = ['INSTITUTION_ADMIN', 'PLACEMENT_STAFF'] as const;
export type InstitutionStaffRole = (typeof INSTITUTION_STAFF_ROLES)[number];

export const AssignRoleResponseSchema = z.object({
  userId: UuidSchema,
  role: UserRoleSchema,
});
export type AssignRoleResponse = z.infer<typeof AssignRoleResponseSchema>;

export const UserHoldResponseSchema = z.object({
  userId: UuidSchema,
  heldAt: IsoDateTimeSchema.nullable(),
});
export type UserHoldResponse = z.infer<typeof UserHoldResponseSchema>;

/* ------------------------------ admin: sessions ---------------------------- */

/** S6-VV-93 — one row per live login (a RefreshToken family with an unrevoked, unexpired token). */
export const ActiveSessionDtoSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  userEmail: EmailSchema,
  userFullName: z.string(),
  userRole: UserRoleSchema,
  familyId: UuidSchema,
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
});
export type ActiveSessionDto = z.infer<typeof ActiveSessionDtoSchema>;

export const ListActiveSessionsQuerySchema = z.object({
  email: EmailSchema.optional(),
  userId: UuidSchema.optional(),
});
export type ListActiveSessionsQuery = z.infer<typeof ListActiveSessionsQuerySchema>;

export const ListActiveSessionsResponseSchema = z.array(ActiveSessionDtoSchema);
export type ListActiveSessionsResponse = z.infer<typeof ListActiveSessionsResponseSchema>;
