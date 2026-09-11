import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { ReverseGeocodeResponse } from '@smart/contracts';
import { GeocodingApiClient, GeocodingNotFoundError } from './geocoding-api.client.js';

@Injectable()
export class GeocodingOnboardingService {
  constructor(@Inject(GeocodingApiClient) private readonly geocoding: GeocodingApiClient) {}

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResponse> {
    try {
      return await this.geocoding.reverseGeocode(lat, lng);
    } catch (error) {
      if (error instanceof GeocodingNotFoundError) {
        throw new NotFoundException({
          error: 'geocode_city_not_found',
          message: 'Could not resolve a city for your location. Please pick one manually.',
          statusCode: 404,
        });
      }
      throw new ServiceUnavailableException({
        error: 'geocode_unavailable',
        message: 'Location lookup is unavailable right now. Please pick a city manually.',
        statusCode: 503,
      });
    }
  }
}
