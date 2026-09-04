import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  FetchGithubProfileResponse,
  GithubRepoReadmeResponse,
  ListGithubReposResponse,
  RepoLanguagesResponse,
} from '@smart/contracts';
import { extractGithubLogin, GithubApiClient, GithubNotFoundError } from './github-api.client.js';

const MAX_SELECTED_REPOS = 5;

/**
 * CN-T01 onboarding surface over `GithubApiClient` — turns raw GitHub errors
 * into the "skip and add it later" UX the onboarding wizard needs, since
 * GitHub is optional and a flaky third party must never block the wizard.
 */
@Injectable()
export class GithubOnboardingService {
  constructor(@Inject(GithubApiClient) private readonly github: GithubApiClient) {}

  async fetchProfile(githubUrl: string): Promise<FetchGithubProfileResponse> {
    const login = extractGithubLogin(githubUrl);
    if (!login) {
      throw new BadRequestException({
        error: 'invalid_github_url',
        message: 'That does not look like a github.com profile URL.',
        statusCode: 400,
      });
    }
    return this.withGithubErrors(login, () => this.github.fetchProfile(login));
  }

  async listRepos(login: string): Promise<ListGithubReposResponse> {
    const repos = await this.withGithubErrors(login, () => this.github.listRepos(login));
    return { repos };
  }

  /**
   * Aggregates byte counts across the candidate's chosen repos into a
   * ranked, share-weighted language breakdown — the source for suggested
   * skill tags. Never throws: a repo whose languages call fails just
   * contributes nothing, so one flaky lookup doesn't blank the whole tab.
   */
  async repoLanguages(repoFullNames: string[]): Promise<RepoLanguagesResponse> {
    const unique = Array.from(new Set(repoFullNames)).slice(0, MAX_SELECTED_REPOS);
    const settled = await Promise.allSettled(unique.map((name) => this.github.repoLanguages(name)));

    const totals = new Map<string, { bytes: number; repoCount: number }>();
    let grandTotal = 0;
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      for (const [language, bytes] of Object.entries(result.value)) {
        const entry = totals.get(language) ?? { bytes: 0, repoCount: 0 };
        entry.bytes += bytes;
        entry.repoCount += 1;
        totals.set(language, entry);
        grandTotal += bytes;
      }
    }

    const languages = Array.from(totals.entries())
      .map(([language, { bytes, repoCount }]) => ({
        language,
        bytes,
        byteShare: grandTotal > 0 ? bytes / grandTotal : 0,
        repoCount,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 20);

    return { languages };
  }

  /** Never throws — a missing/unreadable README just means an empty prefill, not a form error. */
  async getReadme(fullName: string): Promise<GithubRepoReadmeResponse> {
    const readme = await this.github.getReadme(fullName);
    return { readme };
  }

  private async withGithubErrors<T>(login: string, load: () => Promise<T>): Promise<T> {
    try {
      return await load();
    } catch (error) {
      if (error instanceof GithubNotFoundError) {
        throw new NotFoundException({
          error: 'github_user_not_found',
          message: `No public GitHub profile found for "${login}".`,
          statusCode: 404,
        });
      }
      throw new ServiceUnavailableException({
        error: 'github_unavailable',
        message: 'GitHub is unavailable right now. You can skip this and add it later.',
        statusCode: 503,
      });
    }
  }
}
