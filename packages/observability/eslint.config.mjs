import { base } from '@smart/eslint-config/base';

/** Observability package — no console; use createLogger / logEvent. */
export default [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },
];
