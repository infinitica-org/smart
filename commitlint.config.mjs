/**
 * Conventional Commits, scoped to SMART's module boundaries.
 *
 * The `scope-enum` list is deliberately the same as the module ownership matrix in
 * TEAM.md §3 — a commit scope names exactly one owned area, which makes
 * `git log --grep` a usable ownership audit.
 *
 * Every commit subject must reference its ticket, e.g.
 *   feat(rate-limit): sliding window lua guard (S1-VV-04)
 *
 * Owner: Tino (System Architect).
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'perf',
        'refactor',
        'test',
        'docs',
        'build',
        'ci',
        'chore',
        'revert',
        'content', // item banks, BARS anchors, cut scores (Vedika)
        'prompt', // versioned prompt template changes (Ramansh)
        'adr', // architecture decision records (Tino)
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        // backend modules
        'platform',
        'auth',
        'users',
        'rate-limit',
        'sandbox',
        'assessment',
        'certificate',
        'webhooks',
        'catalog',
        'calibration',
        'placement',
        'analytics',
        'ai-gateway',
        'evaluation',
        'matching',
        // shared packages
        'contracts',
        'scoring-engine',
        'prompts',
        'ui',
        'api-client',
        'observability',
        'config',
        // apps
        'web-student',
        'web-tpo',
        'web-admin',
        'web-verify',
        'web-auth',
        'api-core',
        // tooling
        'content-pipeline',
        'load-tests',
        'e2e',
        'infra',
        'ci',
        'docs',
        'deps',
        'repo',
      ],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
};
