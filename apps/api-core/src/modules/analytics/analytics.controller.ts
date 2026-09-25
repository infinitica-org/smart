import { Controller, Get, Inject, Query } from '@nestjs/common';
import { API_PREFIX, TrackCodeSchema } from '@smart/contracts';
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
      status: 'active',
    };
  }

  @Get('correlation')
  correlation(@Query('trackCode') trackCode?: string) {
    const parsed = trackCode ? TrackCodeSchema.parse(trackCode) : undefined;
    return this.service.getCorrelationReport(parsed);
  }

  @Get('adverse-impact')
  adverseImpact(
    @Query('trackCode') trackCode?: string,
    @Query('levelNumber') levelNumber?: string,
  ) {
    const parsedTrack = trackCode ? TrackCodeSchema.parse(trackCode) : undefined;
    const parsedLevel = levelNumber ? (Number(levelNumber) as 1 | 2 | 3 | 4 | 5) : 1;
    return this.service.getAdverseImpactReport(parsedTrack, parsedLevel);
  }
}
