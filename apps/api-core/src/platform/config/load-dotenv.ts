import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

/**
 * Turbo/`tsx` run with cwd = `apps/api-core`, but local secrets live in the
 * repo-root `.env`. Default `dotenv/config` only looks at cwd, so AI keys
 * never reach `env.ts` even when the data-plane defaults still work.
 */
export function resolveDotenvPath(
  cwd = process.cwd(),
  exists: (path: string) => boolean = existsSync,
): string | undefined {
  const candidates = [resolve(cwd, '.env'), resolve(cwd, '../../.env')];
  return candidates.find((path) => exists(path));
}

export function loadDotenv(cwd = process.cwd()): string | undefined {
  const path = resolveDotenvPath(cwd);
  if (path) {
    config({ path });
  }
  if (!process.env.GOOGLE_AI_API_KEY?.trim() && process.env.GEMINI_API_KEY?.trim()) {
    process.env.GOOGLE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }
  return path;
}
