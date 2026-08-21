import tseslint from 'typescript-eslint';
import globals from 'globals';
import { base } from './base.js';

/**
 * Next.js / React workspace config.
 *
 * `eslint-config-next` is applied by each app through its own flat config so
 * that Next can resolve its plugins relative to the app root; this file adds
 * the SMART-specific frontend rules on top of the shared base.
 */
export const next = tseslint.config(...base, {
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    globals: { ...globals.browser, ...globals.node },
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  rules: {
    // The API boundary must be typed end to end (TEAM.md §2.3).
    '@typescript-eslint/no-explicit-any': 'error',
    // Next portals may read NEXT_PUBLIC_* (and other public env) via process.env.
    // The Nest-only process.env ban must not apply here.
    'no-restricted-properties': 'off',
    // Raw fetch bypasses @smart/api-client, which owns auth refresh and 429 backoff.
    'no-restricted-globals': [
      'error',
      {
        name: 'fetch',
        message:
          'Use @smart/api-client instead of raw fetch — it owns silent token refresh and Retry-After backoff.',
      },
    ],
  },
});

export default next;
