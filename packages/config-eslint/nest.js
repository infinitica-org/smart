import tseslint from 'typescript-eslint';
import { base } from './base.js';

/**
 * NestJS workspace config.
 *
 * Decorator-heavy code legitimately breaks a few of the base rules (parameter
 * properties, class member ordering), and Nest providers are classes with
 * side-effectful constructors by design.
 */
export const nest = tseslint.config(...base, {
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
  },
});

export default nest;
