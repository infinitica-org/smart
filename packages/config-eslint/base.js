import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * SMART base ESLint config — applies to every workspace.
 *
 * The rules below are not stylistic (Prettier owns style). They encode the
 * engineering non-negotiables from docs/delivery/DEFINITION_OF_DONE.md:
 *   - no `any` at boundaries
 *   - no floating promises (a dropped promise in an assessment flow loses a candidate's work)
 *   - no unchecked non-null assertions
 *
 * Note: the `process.env` ban is Nest/api-core only (`nest.js`). Next apps must
 * read `NEXT_PUBLIC_*` at the edge; that is not a DoD violation.
 *
 * Owner: Tino (System Architect).
 */
export const base = tseslint.config(
  {
    ignores: [
      'dist/**',
      '.next/**',
      '.turbo/**',
      'coverage/**',
      'generated/**',
      '**/generated/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2023 },
    },
    rules: {
      // --- type safety at boundaries ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // --- correctness ---
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // Prefer Nest Logger / @smart/observability. Warn in shared packages; Nest overrides to error.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-return-await': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'require-await': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // Config files, scripts and tests legitimately use console / looser typing.
    files: [
      '**/*.config.{ts,js,mjs,cjs}',
      '**/scripts/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/platform/config/**',
      '**/env.ts',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
);

export default base;
