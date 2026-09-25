import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ResolveTrustReportRequestSchema,
  SubmitTrustReportRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/guards/public.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { TrustService } from './trust.service.js';
import type { TrustReportCategory, TrustReportStatus } from '../../generated/prisma/index.js';

@ApiTags('trust-reports')
@Controller(API_PREFIX)
export class TrustReportController {
  constructor(@Inject(TrustService) private readonly service: TrustService) {}

  @Public()
  @Post('trust/reports')
  @ApiOperation({
    summary: 'Submit a third-party abuse or fraud report against a candidate, job, or employer.',
  })
  submitReport(@CurrentUser() user: RequestUser | undefined, @Body() body: unknown) {
    const parsed = SubmitTrustReportRequestSchema.parse(body);
    return this.service.submitReport(parsed, user?.sub);
  }

  @Get('admin/trust/reports')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @ApiOperation({ summary: 'List abuse reports in the moderation queue.' })
  listReports(
    @Query('status') status?: TrustReportStatus,
    @Query('category') category?: TrustReportCategory,
  ) {
    return this.service.listReports({ status, category });
  }

  @Post('admin/trust/reports/:reportId/resolve')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve a report in the moderation queue.' })
  resolveReport(
    @CurrentUser() user: RequestUser,
    @Param('reportId') reportId: string,
    @Body() body: unknown,
  ) {
    const parsed = ResolveTrustReportRequestSchema.parse(body);
    return this.service.resolveReport(reportId, parsed, user.sub);
  }
}
