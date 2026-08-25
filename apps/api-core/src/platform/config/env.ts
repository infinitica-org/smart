import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Load repo-root `.env` when the API is started from `apps/api-core`.
 * Package-local `.env` overrides. Does not print file contents.
 */
function loadDotenvFiles(): void {
  const rootEnv = resolve(process.cwd(), '../../.env');
  const localEnv = resolve(process.cwd(), '.env');
  if (existsSync(rootEnv)) loadDotenv({ path: rootEnv });
  if (existsSync(localEnv)) loadDotenv({ path: localEnv, override: true });
}

loadDotenvFiles();

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
  // Host 6380 matches infra/docker (Windows often already binds 6379).
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6380'),
  KAFKA_BROKERS: z.string().default('127.0.0.1:19092'),
  KAFKA_CLIENT_ID: z.string().default('smart-api-core'),

  JWT_SECRET: z.string().min(32).default('local-dev-jwt-secret-change-me-now!!'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  REFRESH_COOKIE_NAME: z.string().default('smart_refresh'),
  REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 14),

  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004',
    ),

  S3_ENDPOINT: z.string().default('http://127.0.0.1:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('smart'),
  S3_ACCESS_KEY: z.string().default('smart'),
  S3_SECRET_KEY: z.string().default('smartsecret'),

  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  AI_MONTHLY_CEILING_USD: z.coerce.number().nonnegative().default(500),

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
  return parsed.data;
}

export const env = loadEnv();
