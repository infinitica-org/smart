import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type {
  ImpersonateRequest,
  SupportDiagnosticResponse,
  SupportGrantRequest,
  SupportGrantResponse,
  SupportHistoryQuery,
  SupportHistoryResponse,
  SupportSessionResponse,
} from '@smart/contracts';
import {
  ImpersonateRequestSchema,
  SupportGrantRequestSchema,
  SupportHistoryQuerySchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { SupportService } from './support.service.js';

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('lookup')
  @Roles('SUPER_ADMIN', 'SUPPORT_LEAD', 'SUPPORT_AGENT')
  async lookupUser(@Query('q') q: string) {
    return this.supportService.lookupUser(q || '');
  }

  @Post('grants')
  @Roles('SUPER_ADMIN', 'SUPPORT_LEAD', 'SUPPORT_AGENT')
  async createGrant(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<SupportGrantResponse> {
    const dto = SupportGrantRequestSchema.parse(body);
    return this.supportService.createGrant(user.sub, user.role, dto);
  }

  @Post('grants/:grantId/revoke')
  @Roles('SUPER_ADMIN', 'SUPPORT_LEAD', 'SUPPORT_AGENT')
  async revokeGrant(
    @CurrentUser() user: RequestUser,
    @Param('grantId') grantId: string,
  ): Promise<{ success: true }> {
    return this.supportService.revokeGrant(user.sub, grantId);
  }

  @Post('impersonate')
  @Roles('SUPER_ADMIN', 'SUPPORT_LEAD', 'SUPPORT_AGENT')
  async impersonateUser(
    @CurrentUser() user: RequestUser,
    @Body() body: unknown,
  ): Promise<SupportSessionResponse> {
    const dto = ImpersonateRequestSchema.parse(body);
    return this.supportService.impersonateUser(user.sub, user.role, dto);
  }

  @Post('session/end')
  @Roles(
    'SUPER_ADMIN',
    'SUPPORT_LEAD',
    'SUPPORT_AGENT',
    'STUDENT',
    'INSTITUTION_ADMIN',
    'PLACEMENT_STAFF',
    'COMPANY',
  )
  async endSession(@CurrentUser() user: RequestUser): Promise<{ success: true }> {
    return this.supportService.endSession(user);
  }

  @Get('diagnostics/:userId')
  @Roles('SUPER_ADMIN', 'SUPPORT_LEAD', 'SUPPORT_AGENT')
  async getDiagnosticSummary(@Param('userId') userId: string): Promise<SupportDiagnosticResponse> {
    return this.supportService.getDiagnosticSummary(userId);
  }

  @Get('history')
  @Roles('SUPER_ADMIN', 'SUPPORT_LEAD')
  async getSupportHistory(@Query() query: unknown): Promise<SupportHistoryResponse> {
    const parsedQuery = SupportHistoryQuerySchema.parse(query);
    return this.supportService.getSupportHistory(parsedQuery);
  }
}
