import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, ListAdminReportsQuerySchema } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { AdminReportsService } from './admin-reports.service.js';

@ApiTags('messaging')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/admin/reports`)
@Roles('SUPER_ADMIN')
export class AdminReportsController {
  constructor(@Inject(AdminReportsService) private readonly reports: AdminReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Moderation queue: reports by target, status and date (no content).' })
  list(@Query() query: Record<string, string | undefined>) {
    const filtered = Object.fromEntries(
      Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    return this.reports.list(ListAdminReportsQuerySchema.parse(filtered));
  }
}
