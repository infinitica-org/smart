import { describe, expect, it } from 'vitest';

import { extractGithubLoginFromUrl, resolveGithubLogin } from './github-login';

describe('extractGithubLoginFromUrl', () => {
  it('parses profile URLs and bare usernames', () => {
    expect(extractGithubLoginFromUrl('https://github.com/octocat')).toBe('octocat');
    expect(extractGithubLoginFromUrl('github.com/vishalbharath')).toBe('vishalbharath');
    expect(extractGithubLoginFromUrl('@my-user')).toBe('my-user');
  });

  it('rejects non-github hosts', () => {
    expect(extractGithubLoginFromUrl('https://gitlab.com/octocat')).toBeNull();
  });
});

describe('resolveGithubLogin', () => {
  it('prefers socialVerification login over githubUrl', () => {
    expect(
      resolveGithubLogin(
        {
          githubUrl: 'https://github.com/from-url',
          socialVerification: {
            linkedin: null,
            github: { login: 'from-social', verified: true, selectedRepos: [] },
          },
        },
        null,
      ),
    ).toBe('from-social');
  });

  it('falls back to githubUrl when social login is missing', () => {
    expect(
      resolveGithubLogin(
        {
          githubUrl: 'https://github.com/url-only',
          socialVerification: { linkedin: null, github: null },
        },
        null,
      ),
    ).toBe('url-only');
  });
});
