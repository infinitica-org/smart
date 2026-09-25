import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import {
  API_PREFIX,
  IntegrityQueueStatusSchema,
  ResolveIntegrityRequestSchema,
  BulkResolveIntegrityRequestSchema,
} from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { AssessmentService } from './assessment.service.js';

@Controller(`${API_PREFIX}/admin/integrity-queue`)
@Roles('SUPER_ADMIN')
export class IntegrityAdminController {
  constructor(@Inject(AssessmentService) private readonly assessment: AssessmentService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.assessment.listIntegrityQueue(
      IntegrityQueueStatusSchema.parse(status ?? 'PENDING'),
    );
  }

  @Post(':attemptId/resolve')
  resolve(
    @Param('attemptId') attemptId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.assessment.resolveIntegrity(
      attemptId,
      ResolveIntegrityRequestSchema.parse(body),
      user.sub,
    );
  }

  @Post('bulk-resolve')
  bulkResolve(@Body() body: unknown, @CurrentUser() user: RequestUser) {
    return this.assessment.bulkResolveIntegrity(
      BulkResolveIntegrityRequestSchema.parse(body),
      user.sub,
    );
  }
}
