import { Module } from '@nestjs/common';
import { GithubApiClient } from './github-api.client.js';
import { GithubOnboardingService } from './github-onboarding.service.js';

@Module({
  providers: [GithubApiClient, GithubOnboardingService],
  exports: [GithubOnboardingService],
})
export class GithubIntegrationModule {}
