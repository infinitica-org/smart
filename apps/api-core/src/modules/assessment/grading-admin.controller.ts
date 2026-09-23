import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { GradingAdminService } from './grading-admin.service.js';

@ApiTags('admin-grading')
@Controller(`${API_PREFIX}/admin`)
@Roles('SUPER_ADMIN')
export class GradingAdminController {
  constructor(@Inject(GradingAdminService) private readonly service: GradingAdminService) {}

  @Get('grading-queue')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List subjective responses awaiting human grading (T17).' })
  listQueue(@Query() query: unknown) {
    return this.service.listQueue(query);
  }

  @Post('responses/:responseId/grade')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually grade a subjective response (T17).' })
  gradeResponse(
    @CurrentUser() user: RequestUser,
    @Param('responseId') responseId: string,
    @Body() body: unknown,
  ) {
    return this.service.gradeResponse(user.sub, responseId, body);
  }
}
