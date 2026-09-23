import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CapabilityInferenceReviewService } from './capability-inference-review.service.js';

@ApiTags('capability-inference-review')
@Controller(`${API_PREFIX}/admin/student-capabilities`)
@Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
@ApiBearerAuth()
export class CapabilityInferenceReviewController {
  constructor(
    @Inject(CapabilityInferenceReviewService)
    private readonly reviews: CapabilityInferenceReviewService,
  ) {}

  @Post(':capabilityId/correct')
  @ApiOperation({ summary: 'Correct or approve a low-confidence inferred capability.' })
  correct(
    @Param('capabilityId') capabilityId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviews.correctCapability(capabilityId, body, user.sub);
  }
}
