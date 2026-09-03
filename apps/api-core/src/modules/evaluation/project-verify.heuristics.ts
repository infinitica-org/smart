import {
  PROJECT_VERIFY_CONFIDENCE_AUTO,
  PROJECT_VERIFY_DUPLICATE_FLAG,
  PROJECT_VERIFY_DUPLICATE_REVIEW,
  PROJECT_VERIFY_TECH_AGE_YEARS,
  PROJECT_VERIFY_WEIGHTS,
  type GithubRepoSnapshot,
  type ProjectStatus,
  type ProjectVerifyFlag,
} from '@smart/contracts';

export function normalizeProjectText(value: string): string {
  return value.toLowerCase().replace(/\s+/gu, ' ').trim();
}

function shingles(text: string, size = 3): Set<string> {
  const words = normalizeProjectText(text)
    .split(' ')
    .filter((word) => word.length > 1);
  const grams = new Set<string>();
  if (words.length < size) {
    if (words.length > 0) grams.add(words.join(' '));
    return grams;
  }
  for (let i = 0; i <= words.length - size; i += 1) {
    grams.add(words.slice(i, i + size).join(' '));
  }
  return grams;
}

export function jaccard(left: string, right: string): number {
  const a = shingles(left);
  const b = shingles(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

/** Highest Jaccard vs prior submissions, scaled 0–100. */
export function duplicateScore(current: string, priors: readonly string[]): number {
  let max = 0;
  for (const prior of priors) {
    max = Math.max(max, jaccard(current, prior));
  }
  return Math.round(max * 10_000) / 100;
}

export function techAgeFlag(repos: readonly GithubRepoSnapshot[], now: Date): boolean {
  const cutoff = now.getTime() - PROJECT_VERIFY_TECH_AGE_YEARS * 365.25 * 24 * 60 * 60 * 1000;
  return repos.some((repo) => repo.ok && Date.parse(repo.pushedAt) < cutoff);
}

export function stackLanguageMismatch(
  stack: string,
  repos: readonly GithubRepoSnapshot[],
): boolean {
  const tokens = normalizeProjectText(stack)
    .split(/[^a-z0-9+#]+/u)
    .filter((token) => token.length > 1);
  const languages = repos.flatMap((repo) =>
    repo.ok ? Object.keys(repo.languages).map((name) => name.toLowerCase()) : [],
  );
  if (tokens.length === 0 || languages.length === 0) return false;
  return !tokens.some((token) =>
    languages.some((lang) => lang.includes(token) || token.includes(lang)),
  );
}

export function compositeProjectScore(input: {
  relevanceScore: number;
  qualityScore: number;
  duplicateScore: number;
}): number {
  const originality = 100 - input.duplicateScore;
  const raw =
    PROJECT_VERIFY_WEIGHTS.relevance * input.relevanceScore +
    PROJECT_VERIFY_WEIGHTS.quality * input.qualityScore +
    PROJECT_VERIFY_WEIGHTS.originality * originality;
  return Math.round(Math.min(100, Math.max(0, raw)) * 100) / 100;
}

export function routeProjectVerification(input: {
  confidence: number;
  flags: readonly ProjectVerifyFlag[];
}): { status: ProjectStatus; routedToReview: boolean } {
  const mustReview =
    input.confidence < PROJECT_VERIFY_CONFIDENCE_AUTO ||
    input.flags.includes('DUPLICATE_TEXT') ||
    input.flags.includes('TECH_AGE') ||
    input.flags.includes('SNAPSHOT_UNAVAILABLE') ||
    input.flags.includes('LLM_UNAVAILABLE') ||
    input.flags.includes('LOW_CONFIDENCE') ||
    input.flags.includes('STACK_LANGUAGE_MISMATCH') ||
    input.flags.includes('PUBLIC_WEB_SIMILARITY');
  if (mustReview) {
    return { status: 'UNDER_REVIEW', routedToReview: true };
  }
  return { status: 'VERIFIED', routedToReview: false };
}

export function collectFlags(input: {
  duplicate: number;
  publicWeb?: number;
  techAge: boolean;
  stackMismatch: boolean;
  snapshotOk: boolean;
  llmFailed: boolean;
  confidence: number;
  webSearchFailed?: boolean;
}): ProjectVerifyFlag[] {
  const flags: ProjectVerifyFlag[] = [];
  if (input.duplicate >= PROJECT_VERIFY_DUPLICATE_FLAG * 100) flags.push('DUPLICATE_TEXT');
  else if (input.duplicate >= PROJECT_VERIFY_DUPLICATE_REVIEW * 100) flags.push('LOW_CONFIDENCE');
  if ((input.publicWeb ?? 0) >= PROJECT_VERIFY_DUPLICATE_FLAG * 100) {
    flags.push('PUBLIC_WEB_SIMILARITY');
  } else if ((input.publicWeb ?? 0) >= PROJECT_VERIFY_DUPLICATE_REVIEW * 100) {
    flags.push('LOW_CONFIDENCE');
  }
  if (input.techAge) flags.push('TECH_AGE');
  if (input.stackMismatch) flags.push('STACK_LANGUAGE_MISMATCH');
  if (!input.snapshotOk) flags.push('SNAPSHOT_UNAVAILABLE');
  if (input.llmFailed) flags.push('LLM_UNAVAILABLE');
  if (input.webSearchFailed) flags.push('LOW_CONFIDENCE');
  if (input.confidence < PROJECT_VERIFY_CONFIDENCE_AUTO && !flags.includes('LOW_CONFIDENCE')) {
    flags.push('LOW_CONFIDENCE');
  }
  return [...new Set(flags)];
}
