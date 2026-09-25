import { Body, Controller, Headers, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, CreateReportRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { JobReportsService } from './job-reports.service.js';

@ApiTags('student-jobs')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/reports`)
@Roles('STUDENT')
export class ReportsController {
  constructor(@Inject(JobReportsService) private readonly reports: JobReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Report a job; a repeat returns the existing report.' })
  create(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.reports.create(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      body: CreateReportRequestSchema.parse(body),
    });
  }
}
