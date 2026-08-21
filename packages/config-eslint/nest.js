import tseslint from 'typescript-eslint';
import { base } from './base.js';

/**
 * NestJS workspace config.
 *
 * Decorator-heavy code legitimately breaks a few of the base rules (parameter
 * properties, class member ordering), and Nest providers are classes with
 * side-effectful constructors by design.
 *
 * Config hygiene: Nest modules must not read `process.env` directly — use the
 * validated `platform/config/env.ts` (DEFINITION_OF_DONE.md §5).
 */
export const nest = tseslint.config(
  ...base,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { legacyDecorators: false },
      },
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      // Nest DI relies on parameter properties in constructors.
      'no-useless-constructor': 'off',
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read configuration from the validated config service (@smart/api-core platform/config/env.ts) — not process.env directly. See DEFINITION_OF_DONE.md §5.',
        },
      ],
    },
  },
  {
    // These Nest paths are allowed to touch process.env (bootstrap / validated loader / tests).
    files: [
      '**/platform/config/**',
      '**/env.ts',
      '**/main.ts',
      '**/*.config.{ts,js,mjs,cjs}',
      '**/scripts/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/prisma/**',
    ],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
);

export default nest;
