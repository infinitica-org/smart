import type { CandidateOnboardingDraft, CandidateOnboardingProfile } from '@smart/contracts';

/** Parses a GitHub profile URL or bare username into a login suitable for list-repos. */
export function extractGithubLoginFromUrl(githubUrl: string): string | null {
  const trimmed = githubUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('@')) {
    const handle = trimmed.slice(1).split('/')[0]?.trim();
    if (handle && /^[\w-]{1,100}$/.test(handle)) return handle;
  }

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
    const [login] = url.pathname.split('/').filter(Boolean);
    if (!login || login.toLowerCase() === 'orgs' || login.toLowerCase() === 'organizations') {
      return null;
    }
    return /^[\w-]{1,100}$/.test(login) ? login : null;
  } catch {
    const bare = trimmed.replace(/^@/, '').split('/')[0]?.trim();
    if (!bare || !/^[\w-]{1,100}$/.test(bare)) return null;
    return bare;
  }
}

type OnboardingProfileLike = Pick<CandidateOnboardingProfile, 'githubUrl' | 'socialVerification'>;
type OnboardingDraftLike = Pick<CandidateOnboardingDraft, 'githubUrl' | 'socialVerification'>;

/** Login for GitHub repo import — verified social login first, then profile/draft githubUrl. */
export function resolveGithubLogin(
  profile: OnboardingProfileLike | null | undefined,
  draft: OnboardingDraftLike | null | undefined,
): string | null {
  const fromSocial =
    profile?.socialVerification?.github?.login?.trim() ||
    draft?.socialVerification?.github?.login?.trim();
  if (fromSocial) return fromSocial;

  const fromUrl =
    extractGithubLoginFromUrl(profile?.githubUrl ?? '') ||
    extractGithubLoginFromUrl(draft?.githubUrl ?? '');
  return fromUrl;
}
