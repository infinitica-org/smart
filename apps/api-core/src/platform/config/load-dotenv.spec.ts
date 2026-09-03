import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDotenv, resolveDotenvPath } from './load-dotenv.js';

describe('resolveDotenvPath', () => {
  const cwd = resolve('/workspace/apps/api-core');

  it('prefers a package-local .env when present', () => {
    const local = resolve(cwd, '.env');
    const found = resolveDotenvPath(cwd, (path) => path === local);
    expect(found).toBe(local);
  });

  it('falls back to the repo-root .env used by local development', () => {
    const root = resolve(cwd, '../../.env');
    const found = resolveDotenvPath(cwd, (path) => path === root);
    expect(found).toBe(root);
  });

  it('returns undefined when neither candidate exists', () => {
    expect(resolveDotenvPath(cwd, () => false)).toBeUndefined();
  });
});

describe('loadDotenv aliases', () => {
  it('copies GEMINI_API_KEY onto GOOGLE_AI_API_KEY when the latter is empty', () => {
    const previousGoogle = process.env.GOOGLE_AI_API_KEY;
    const previousGemini = process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    try {
      loadDotenv(resolve('/no-such-smart-env-dir'));
      expect(process.env.GOOGLE_AI_API_KEY).toBe('test-gemini-key');
    } finally {
      if (previousGoogle === undefined) {
        delete process.env.GOOGLE_AI_API_KEY;
      } else {
        process.env.GOOGLE_AI_API_KEY = previousGoogle;
      }
      if (previousGemini === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previousGemini;
      }
    }
  });
});
