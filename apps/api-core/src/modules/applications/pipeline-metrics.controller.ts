import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, ConversionMetricsQuerySchema } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { PipelineMetricsService } from './pipeline-metrics.service.js';

@ApiTags('applications')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/admin/applications`)
@Roles('SUPER_ADMIN')
export class PipelineMetricsController {
  constructor(@Inject(PipelineMetricsService) private readonly metrics: PipelineMetricsService) {}

  @Get('conversion')
  @ApiOperation({ summary: 'Shortlist-to-interview and interview-to-hire conversion.' })
  conversion(@Query() query: Record<string, string | undefined>) {
    const filtered = Object.fromEntries(
      Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    return this.metrics.conversion(ConversionMetricsQuerySchema.parse(filtered));
  }
}
