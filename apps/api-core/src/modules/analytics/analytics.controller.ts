import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { AnalyticsService } from './analytics.service.js';

@Controller(`${API_PREFIX}/analytics`)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

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
