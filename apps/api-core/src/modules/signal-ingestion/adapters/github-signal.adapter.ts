import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ACTIVE_TAXONOMY_VERSION,
  type ConnectSignalSourceRequest,
  type RawSignalEnvelope,
} from '@smart/contracts';
import {
  extractGithubLogin,
  GithubApiClient,
} from '../../integrations/github/github-api.client.js';
import { GithubOnboardingService } from '../../integrations/github/github-onboarding.service.js';
import type {
  AdapterFetchContext,
  ConnectValidationResult,
  SignalSourceAdapter,
} from './signal-source.adapter.js';

const CONSENT_SCOPE = 'github.profile.public_refresh';

/**
 * GitHub passive signal adapter — wraps existing onboarding client (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class GithubSignalAdapter implements SignalSourceAdapter {
  readonly sourceId = 'GITHUB' as const;
  readonly supportedConsentScopes = [CONSENT_SCOPE] as const;

  constructor(
    @Inject(GithubOnboardingService) private readonly onboarding: GithubOnboardingService,
    @Inject(GithubApiClient) private readonly github: GithubApiClient,
  ) {}

  async validateConnectInput(input: ConnectSignalSourceRequest): Promise<ConnectValidationResult> {
    if (!('githubUrl' in input)) {
      throw new BadRequestException({
        error: 'invalid_connect_body',
        message: 'GITHUB connect requires githubUrl.',
        statusCode: 400,
      });
    }
    const login = extractGithubLogin(input.githubUrl);
    if (!login) {
      throw new BadRequestException({
        error: 'invalid_github_url',
        message: 'That does not look like a github.com profile URL.',
        statusCode: 400,
      });
    }
    await this.onboarding.fetchProfile(input.githubUrl);
    return {
      externalAccountId: login,
      consentScope: CONSENT_SCOPE,
      metadata: {
        selectedRepoFullNames: input.selectedRepoFullNames ?? [],
        selectedSkillNames: input.selectedSkillNames ?? [],
      },
    };
  }

  async fetchRaw(ctx: AdapterFetchContext): Promise<RawSignalEnvelope> {
    const login = ctx.externalAccountId;
    const metadata = ctx.metadata ?? {};
    let repoFullNames = Array.isArray(metadata.selectedRepoFullNames)
      ? (metadata.selectedRepoFullNames as string[])
      : [];

    if (repoFullNames.length === 0) {
      const repos = await this.github.listRepos(login);
      repoFullNames = repos.slice(0, 5).map((repo) => repo.fullName);
    }

    const { languages } = await this.onboarding.repoLanguages(repoFullNames);
    const selectedSkillNames = Array.isArray(metadata.selectedSkillNames)
      ? (metadata.selectedSkillNames as string[])
      : [];

    return {
      userId: ctx.userId,
      sourceId: 'GITHUB',
      externalAccountId: login,
      fetchedAt: new Date().toISOString(),
      consentScope: ctx.consentScope,
      taxonomyVersion: ACTIVE_TAXONOMY_VERSION,
      payload: {
        sourceId: 'GITHUB',
        languages,
        selectedSkillNames,
      },
    };
  }

  async checkHealth(): Promise<{ reachable: boolean; latencyMs: number }> {
    const started = Date.now();
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        signal: AbortSignal.timeout(4_000),
      });
      return { reachable: response.ok, latencyMs: Date.now() - started };
    } catch {
      return { reachable: false, latencyMs: Date.now() - started };
    }
  }
}
