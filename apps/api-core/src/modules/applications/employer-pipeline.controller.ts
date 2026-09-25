import { Body, Controller, Headers, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, TransitionApplicationRequestSchema, UuidSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { EmployerPipelineService } from './employer-pipeline.service.js';

@ApiTags('applications')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/employer`)
@Roles('COMPANY')
export class EmployerPipelineController {
  constructor(
    @Inject(EmployerPipelineService) private readonly pipeline: EmployerPipelineService,
  ) {}

  @Post('applications/:id/transition')
  @ApiOperation({
    summary: 'Move an applicant to another stage (409 if it changed, 422 if not allowed).',
  })
  transition(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    const applicationId = UuidSchema.safeParse(id);
    if (!applicationId.success) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Application not found.',
        statusCode: 404,
      });
    }
    return this.pipeline.transition(user.sub, applicationId.data, {
      key: IdempotencyService.requireKey(idempotencyKey),
      body: TransitionApplicationRequestSchema.parse(body),
    });
  }
}
