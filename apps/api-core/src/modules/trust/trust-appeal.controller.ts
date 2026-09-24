import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ResolveTrustAppealRequestSchema,
  SubmitTrustAppealRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { TrustService } from './trust.service.js';
import { AppealStatus } from '../../generated/prisma/index.js';

@ApiTags('trust-appeals')
@Controller(API_PREFIX)
export class TrustAppealController {
  constructor(@Inject(TrustService) private readonly service: TrustService) {}

  @Post('trust/appeals')
  @ApiBearerAuth()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Submit an appeal against an active enforcement action.' })
  submitAppeal(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const parsed = SubmitTrustAppealRequestSchema.parse(body);
    return this.service.submitAppeal(parsed, user.sub);
  }

  @Get('admin/trust/appeals')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List candidate enforcement appeals awaiting review.' })
  listAppeals(@Query('status') status?: AppealStatus) {
    return this.service.listAppeals({ status });
  }

  @Post('admin/trust/appeals/:appealId/resolve')
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve a candidate enforcement appeal (uphold or reject).' })
  resolveAppeal(
    @CurrentUser() user: RequestUser,
    @Param('appealId') appealId: string,
    @Body() body: unknown,
  ) {
    const parsed = ResolveTrustAppealRequestSchema.parse(body);
    return this.service.resolveAppeal(appealId, parsed, user.sub);
  }
}
