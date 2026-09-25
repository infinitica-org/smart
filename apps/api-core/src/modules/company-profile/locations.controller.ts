import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, LocationSearchQuerySchema } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { LocationSearchService } from './location-search.service.js';

@ApiTags('company-profile')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/locations`)
@Roles('COMPANY')
export class LocationsController {
  constructor(@Inject(LocationSearchService) private readonly locations: LocationSearchService) {}

  @Get('search')
  @ApiOperation({ summary: 'Cached location suggestions from a public geocoding API.' })
  async search(@Query() query: Record<string, string | undefined>) {
    const { q } = LocationSearchQuerySchema.parse(query);
    return { locations: await this.locations.search(q) };
  }
}
