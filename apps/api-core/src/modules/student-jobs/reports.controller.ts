import { Body, Controller, ForbiddenException, Headers, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, CreateReportRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { MESSAGING_ROLES } from '../messaging/messaging.constants.js';
import { MessageReportsService } from '../messaging/message-reports.service.js';
import { JobReportsService } from './job-reports.service.js';

@ApiTags('student-jobs')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/reports`)
@Roles(...MESSAGING_ROLES)
export class ReportsController {
  constructor(
    @Inject(JobReportsService) private readonly reports: JobReportsService,
    @Inject(MessageReportsService) private readonly messageReports: MessageReportsService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Report a job (students) or a message (any participant); a repeat returns the existing report.',
  })
  create(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    const params = {
      key: IdempotencyService.requireKey(idempotencyKey),
      body: CreateReportRequestSchema.parse(body),
    };
    if (params.body.targetType === 'MESSAGE') return this.messageReports.create(user.sub, params);
    // Job reports stay a student feature.
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students can report jobs.',
        statusCode: 403,
      });
    }
    return this.reports.create(user.sub, params);
  }
}
