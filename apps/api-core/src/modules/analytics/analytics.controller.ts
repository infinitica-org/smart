import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { AnalyticsService } from './analytics.service.js';

@Controller(`${API_PREFIX}/analytics`)
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly service: AnalyticsService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'analytics',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
