import { Body, Controller, Headers, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, CreateCompanyReviewRequestSchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { IdempotencyService } from './idempotency.service.js';
import { StudentCompanyReviewsService } from './student-company-reviews.service.js';

@ApiTags('company-profile')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/me/company-reviews`)
@Roles('STUDENT')
export class MeCompanyReviewsController {
  constructor(
    @Inject(StudentCompanyReviewsService) private readonly reviews: StudentCompanyReviewsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Review a company I applied to; I choose whether it may respond.' })
  create(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.reviews.create(user.sub, {
      key: IdempotencyService.requireKey(idempotencyKey),
      body: CreateCompanyReviewRequestSchema.parse(body),
    });
  }
}
