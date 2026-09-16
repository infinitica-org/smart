import type { GithubRepoSnapshot, ProjectGithubSnapshot } from '@smart/contracts';
import { GithubApiClient } from '../integrations/github/github-api.client.js';

export function parseGithubRepoUrl(
  url: string,
): { owner: string; name: string; fullName: string; htmlUrl: string } | null {
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(withScheme);
    if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0]!;
    const name = parts[1]!.replace(/\.git$/i, '');
    return {
      owner,
      name,
      fullName: `${owner}/${name}`,
      htmlUrl: `https://github.com/${owner}/${name}`,
    };
  } catch {
    return null;
  }
}

async function fetchRepoHeadSha(fullName: string, token?: string): Promise<string | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'smart-project-verify',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${fullName}`, {
      headers,
      signal: AbortSignal.timeout(4_000),
    });
    if (!repoRes.ok) return null;
    const repo = (await repoRes.json()) as { default_branch?: string };
    const branch = repo.default_branch ?? 'main';
    const commitRes = await fetch(
      `https://api.github.com/repos/${fullName}/commits/${encodeURIComponent(branch)}`,
      { headers, signal: AbortSignal.timeout(4_000) },
    );
    if (!commitRes.ok) return null;
    const commit = (await commitRes.json()) as { sha?: string };
    return commit.sha ?? null;
  } catch {
    return null;
  }
}

export async function buildProjectGithubSnapshot(input: {
  projectId: string;
  studentId: string;
  githubUrl: string;
  github: GithubApiClient;
  githubApiToken?: string;
}): Promise<{ snapshot: ProjectGithubSnapshot; snapshotSha: string | null }> {
  const ref = parseGithubRepoUrl(input.githubUrl);
  const now = new Date().toISOString();
  if (!ref) {
    return {
      snapshotSha: null,
      snapshot: {
        projectId: input.projectId,
        studentId: input.studentId,
        snapshotVersion: 1,
        repos: [],
      },
    };
  }

  const snapshotSha = await fetchRepoHeadSha(ref.fullName, input.githubApiToken);
  const [readme, languages] = await Promise.all([
    input.github.getReadme(ref.fullName),
    input.github.repoLanguages(ref.fullName),
  ]);

  const primaryLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const repo: GithubRepoSnapshot = {
    owner: ref.owner,
    name: ref.name,
    htmlUrl: ref.htmlUrl,
    defaultBranch: 'main',
    isPrivate: false,
    githubRepoId: 1,
    fetchedAt: now,
    description: null,
    primaryLanguage,
    languages,
    topics: [],
    licenseSpdx: null,
    createdAt: now,
    pushedAt: now,
    stargazersCount: 0,
    forksCount: 0,
    isFork: false,
    parentFullName: null,
    openIssuesCount: 0,
    archived: false,
    readmePath: readme ? 'README.md' : null,
    readmeMarkdown: readme ?? '',
    readmeSha: snapshotSha,
    readmeTruncated: false,
    rootEntries: [],
    detectedFiles: {
      hasPackageJson: false,
      hasPyproject: false,
      hasDockerfile: false,
      hasCiConfig: false,
      hasLockfile: false,
      hasTestsDir: false,
    },
    recentCommits: snapshotSha
      ? [
          {
            sha: snapshotSha,
            committedAt: now,
            message: 'HEAD',
          },
        ]
      : [],
    uniqueAuthorLogins: [],
    commitSpanDays: null,
    ok: Boolean(snapshotSha),
    unavailableReason: snapshotSha ? undefined : 'not_found',
  };

  return {
    snapshotSha,
    snapshot: {
      projectId: input.projectId,
      studentId: input.studentId,
      snapshotVersion: 1,
      repos: [repo],
    },
  };
}
