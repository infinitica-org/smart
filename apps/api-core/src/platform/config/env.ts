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
      'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006,http://localhost:3007,http://localhost',
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
  COMPANY_APP_URL: z.string().default('http://localhost:3006'),

  INVITATION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(48),
  PASSWORD_RESET_TTL_HOURS: z.coerce.number().int().positive().default(2),

  S3_ENDPOINT: z.string().default('http://127.0.0.1:9000'),
  /** Browser-reachable S3/MinIO base URL for presigned PUT/GET (defaults to S3_ENDPOINT). */
  S3_PUBLIC_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('smart'),
  S3_ACCESS_KEY: z.string().default('smart'),
  S3_SECRET_KEY: z.string().default('smartsecret'),
  /**
   * S6-VV-119 — `required`: every server-side write asks for SSE and boot fails unless the bucket has
   * default encryption. Only switch it on after MinIO has a KMS key (docs/delivery/STORAGE_ENCRYPTION.md).
   */
  S3_ENCRYPTION: z.enum(['off', 'required']).default('off'),
  /** S6-VV-120 — `required` scans every upload with clamd and refuses it if clamd is unreachable. */
  FILE_SCAN: z.enum(['off', 'required']).default('off'),
  CLAMD_HOST: z.string().default('clamav'),
  CLAMD_PORT: z.coerce.number().int().positive().default(3310),
  CLAMD_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  /**
   * CN-T01 GitHub identity/repo-picker proxy. Unauthenticated GitHub REST calls
   * are capped at 60/hr per source IP — far too low once real traffic hits this
   * endpoint. Setting a PAT (no scopes needed, public data only) raises that to
   * 5,000/hr. No user-facing GitHub OAuth: we only ever read public data.
   */
  GITHUB_API_TOKEN: z.string().optional(),

  QLIX_API_KEY: z.string().optional(),
  QLIX_BASE_URL: z.string().default('https://qlix.exora.solutions/api/v1'),
  QLIX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
  QLIX_POLL_HARD_CAP_MS: z.coerce.number().int().positive().default(1_800_000),
  QLIX_SIMILARITY_HARD_FAIL: z.coerce.number().min(0).max(100).default(50),
  QLIX_SIMILARITY_BORDERLINE: z.coerce.number().min(0).max(100).default(30),
  QLIX_AI_LIKELIHOOD_FLAG: z.coerce.number().min(0).max(100).default(60),

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

  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  AI_PRIMARY_PROVIDER: z.enum(['ANTHROPIC', 'GOOGLE', 'OPENROUTER']).optional(),
  AI_MONTHLY_CEILING_USD: z.coerce.number().nonnegative().default(500),

  /** stub = client Web Speech transcript + browser TTS; whisper/google when wired. */
  SPEECH_STT_PROVIDER: z.enum(['stub', 'whisper', 'google']).default('stub'),
  SPEECH_TTS_PROVIDER: z.enum(['stub', 'google', 'openai']).default('stub'),
  /** OpenAI Whisper API — used when SPEECH_STT_PROVIDER=whisper. */
  OPENAI_API_KEY: z.string().optional(),
  SPEECH_WHISPER_MODEL: z.string().default('whisper-1'),

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
  PROCTORING_CV_PROVIDER: z.enum(['stub', 'real']).default('stub'),

  ITEM_RETIREMENT_THRESHOLD: z.coerce.number().int().positive().default(500),

  ASSESSMENT_INTELLIGENCE_V1: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  /** Explicit stub guard for project-defense oral interview evaluation. Never allowed in production. */
  ENABLE_DEFENSE_STUB: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  /** Explicit stub guard for QLIX code plagiarism checking. Never allowed in production. */
  ENABLE_QLIX_STUB: z
    .enum(['true', 'false'])
    .default('false')
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

/**
 * Local MinIO uses MINIO_ROOT_* as the S3 API identity. When S3_ACCESS_KEY matches
 * MINIO_ROOT_USER but S3_SECRET_KEY drifted (common after copying .env snippets),
 * prefer the MinIO root password so uploads do not fail with InvalidAccessKeyId.
 */
export function alignS3CredentialsWithMinioRoot(
  data: Env,
  source: NodeJS.ProcessEnv = process.env,
): Env {
  const minioUser = source.MINIO_ROOT_USER?.trim();
  const minioPassword = source.MINIO_ROOT_PASSWORD?.trim();
  if (!minioUser || !minioPassword) return data;
  if (data.S3_ACCESS_KEY === minioUser && data.S3_SECRET_KEY !== minioPassword) {
    return { ...data, S3_SECRET_KEY: minioPassword };
  }
  return data;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }

  const data = alignS3CredentialsWithMinioRoot(parsed.data, source);
  const defaultJwt = 'local-dev-jwt-secret-change-me-now!!';
  if (data.NODE_ENV === 'production' && data.JWT_SECRET === defaultJwt) {
    throw new Error(
      'Invalid environment: JWT_SECRET must be set to a non-default value in production',
    );
  }
  if (data.NODE_ENV === 'production' && !data.METRICS_SCRAPE_TOKEN) {
    throw new Error('Invalid environment: METRICS_SCRAPE_TOKEN is required in production');
  }
  if (data.NODE_ENV === 'production' && data.ENABLE_DEFENSE_STUB) {
    throw new Error('Invalid environment: ENABLE_DEFENSE_STUB cannot be enabled in production');
  }
  if (data.NODE_ENV === 'production' && data.ENABLE_QLIX_STUB) {
    throw new Error('Invalid environment: ENABLE_QLIX_STUB cannot be enabled in production');
  }
  return data;
}

export const env = loadEnv();
