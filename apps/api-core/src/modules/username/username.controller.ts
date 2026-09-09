import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  ReserveUsernameRequestSchema,
  UpdateProfileVisibilityRequestSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { UsernameService } from './username.service.js';

@ApiTags('username')
@Controller(`${API_PREFIX}/users/me`)
@Roles('STUDENT')
export class UsernameController {
  constructor(@Inject(UsernameService) private readonly service: UsernameService) {}

  @Get('username')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the caller's username reservation status (CN-T09)." })
  getStatus(@CurrentUser() user: RequestUser) {
    return this.service.getStatus(user.sub);
  }

  @Put('username')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reserve a case-insensitive username. Reservation is not the same as activation.',
  })
  reserve(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const parsed = ReserveUsernameRequestSchema.parse(body);
    return this.service.reserve(user.sub, parsed);
  }

  @Put('visibility')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Global public-profile visibility toggle, and the opt-in show-in-progress-items flag.',
  })
  updateVisibility(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    const parsed = UpdateProfileVisibilityRequestSchema.parse(body);
    return this.service.updateVisibility(user.sub, parsed);
  }
}
