import { z } from 'zod';

/**
 * Validated process environment.
 *
 * Every other module reads `env`, never `process.env`. That is what stops a
 * missing JWT secret from becoming a production outage discovered by a candidate.
 *
 * Owner: Vishal V.
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default('smart-api-core'),
  APP_VERSION: z.string().default('0.1.0'),

  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://smart:smart@127.0.0.1:5432/smart?schema=public'),
  /**
   * Transaction-mode PgBouncer endpoint for the app's own runtime pool.
   * `prisma migrate deploy`/the CLI always use DATABASE_URL (direct to
   * postgres) — transaction pooling doesn't support the session-level
   * features migrations need. Falls back to DATABASE_URL when unset, so
   * laptop dev (no pgbouncer container) needs no extra config.
   */
  POOLED_DATABASE_URL: z.string().min(1).optional(),
  // Host 6380 matches infra/docker (Windows often already binds 6379).
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6380'),
  KAFKA_BROKERS: z.string().default('127.0.0.1:19092'),
  KAFKA_CLIENT_ID: z.string().default('smart-api-core'),

  JWT_SECRET: z.string().min(32).default('local-dev-jwt-secret-change-me-now!!'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_COOKIE_NAME: z.string().default('smart_refresh'),
  REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 14),

  /** Prometheus scrape token. Required in production for /api/v1/admin/metrics. */
  METRICS_SCRAPE_TOKEN: z.string().optional(),

  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005',
    ),

  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('SMART Platform <noreply@smart.local>'),

  AUTH_APP_URL: z.string().default('http://localhost:3005'),
  STUDENT_APP_URL: z.string().default('http://localhost:3001'),
  TPO_APP_URL: z.string().default('http://localhost:3002'),
  ADMIN_APP_URL: z.string().default('http://localhost:3003'),
  VERIFY_APP_URL: z.string().default('http://localhost:3004'),

  INVITATION_TTL_DAYS: z.coerce.number().int().positive().default(7),

  S3_ENDPOINT: z.string().default('http://127.0.0.1:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('smart'),
  S3_ACCESS_KEY: z.string().default('smart'),
  S3_SECRET_KEY: z.string().default('smartsecret'),

  /**
   * CN-T01 GitHub identity/repo-picker proxy. Unauthenticated GitHub REST calls
   * are capped at 60/hr per source IP — far too low once real traffic hits this
   * endpoint. Setting a PAT (no scopes needed, public data only) raises that to
   * 5,000/hr. No user-facing GitHub OAuth: we only ever read public data.
   */
  GITHUB_API_TOKEN: z.string().optional(),

  /**
   * CN-T01 LinkedIn identity verification. LinkedIn has no public profile-
   * scraping API, so verification is the compliant "Sign in with LinkedIn"
   * OIDC flow (scope: openid profile email) — never scraping the pasted URL.
   */
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  /** Must exactly match the redirect URI registered on the LinkedIn app. */
  LINKEDIN_REDIRECT_URI: z
    .string()
    .default('http://localhost:3000/api/v1/users/onboarding/linkedin/callback'),

  /** Login SSO — Google OAuth (OpenID Connect). */
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  /** Login SSO — Microsoft Entra / Azure AD (OpenID Connect). */
  MICROSOFT_OAUTH_CLIENT_ID: z.string().optional(),
  MICROSOFT_OAUTH_CLIENT_SECRET: z.string().optional(),
  /** `common` (default), `organizations`, `consumers`, or a tenant GUID. */
  MICROSOFT_OAUTH_TENANT: z.string().default('common'),

  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  AI_PRIMARY_PROVIDER: z.enum(['ANTHROPIC', 'GOOGLE', 'OPENROUTER']).optional(),
  AI_MONTHLY_CEILING_USD: z.coerce.number().nonnegative().default(500),

  CREDLY_API_KEY: z.string().optional(),
  ACCREDIBLE_API_KEY: z.string().optional(),
  AWS_CERT_API_KEY: z.string().optional(),
  GOOGLE_CERT_API_KEY: z.string().optional(),
  MICROSOFT_CERT_API_KEY: z.string().optional(),

  PROCTORING_FULL: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  PROCTORING_CV_URL: z.string().default('http://127.0.0.1:8091'),

  ITEM_RETIREMENT_THRESHOLD: z.coerce.number().int().positive().default(500),

  ASSESSMENT_INTELLIGENCE_V1: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  /** CN-T07 profile activation policy: SEGMENT_AWARE (default) or STRICT_ALL_THREE. */
  PROFILE_ACTIVATION_POLICY: z.enum(['SEGMENT_AWARE', 'STRICT_ALL_THREE']).default('SEGMENT_AWARE'),

  /**
   * OTLP/HTTP collector endpoint (e.g. `http://localhost:4318` locally, or
   * `http://tempo:4318` inside the `obs` compose profile). Unset by default —
   * OpenTelemetry is entirely opt-in; nothing in `tracing.ts` runs without it,
   * so a deployment that never sets this is byte-for-byte unaffected.
   */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  /** Fraction of requests traced, 0-1. Lower this under sustained load tests to bound overhead. */
  OTEL_TRACES_SAMPLER_RATIO: z.coerce.number().min(0).max(1).default(1),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }

  const data = parsed.data;
  const defaultJwt = 'local-dev-jwt-secret-change-me-now!!';
  if (data.NODE_ENV === 'production' && data.JWT_SECRET === defaultJwt) {
    throw new Error(
      'Invalid environment: JWT_SECRET must be set to a non-default value in production',
    );
  }
  if (data.NODE_ENV === 'production' && !data.METRICS_SCRAPE_TOKEN) {
    throw new Error('Invalid environment: METRICS_SCRAPE_TOKEN is required in production');
  }
  return data;
}

export const env = loadEnv();
