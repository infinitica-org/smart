import { Module } from '@nestjs/common';
import { GeocodingApiClient } from './geocoding-api.client.js';
import { GeocodingOnboardingService } from './geocoding-onboarding.service.js';

@Module({
  providers: [GeocodingApiClient, GeocodingOnboardingService],
  exports: [GeocodingOnboardingService],
})
export class GeocodingIntegrationModule {}
