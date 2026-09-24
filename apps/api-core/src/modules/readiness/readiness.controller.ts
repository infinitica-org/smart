import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { ReadinessService } from './readiness.service.js';

@ApiTags('readiness')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/users/me`)
@Roles('STUDENT')
export class ReadinessController {
  constructor(@Inject(ReadinessService) private readonly service: ReadinessService) {}

  @Get('readiness')
  @ApiOperation({
    summary:
      'My readiness: identity, evidence, skill demonstration, proficiency, role readiness and recommendations.',
  })
  getReadiness(@CurrentUser() user: RequestUser) {
    return this.service.getSummary(user.sub);
  }
}
