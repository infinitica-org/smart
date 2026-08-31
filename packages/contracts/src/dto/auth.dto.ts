import { z } from 'zod';
import {
  AuthProviderSchema,
  SessionHoldCodeSchema,
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
  primaryTrack: TrackCodeSchema.nullable(),
  secondaryTrack: TrackCodeSchema.nullable(),
  provider: AuthProviderSchema,
  emailVerified: z.boolean(),
  createdAt: IsoDateTimeSchema,
  sessionHold: z
    .object({
      code: SessionHoldCodeSchema,
      message: z.string(),
    })
    .nullable(),
});
export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

/* -------------------------------- JWT claims ------------------------------ */

/**
 * Access token claims. Guards validate these in memory with zero DB hits —
 * that is what makes 50k concurrent candidates affordable.
 */
export const AccessTokenClaimsSchema = z.object({
  sub: UuidSchema,
  role: UserRoleSchema,
  inst: UuidSchema.nullable(),
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
