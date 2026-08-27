import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import {
  API_PREFIX,
  CreateInstitutionRequestSchema,
  InviteUserRequestSchema,
} from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { InstitutionsService } from './institutions.service.js';

@Controller(`${API_PREFIX}/admin`)
@Roles('SUPER_ADMIN')
export class InstitutionsAdminController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Post('institutions')
  createInstitution(@Body() body: unknown) {
    return this.institutions.createInstitution(CreateInstitutionRequestSchema.parse(body));
  }

  @Get('institutions')
  listInstitutions() {
    return this.institutions.listInstitutions();
  }

  @Get('institutions/:institutionId')
  getInstitution(@Param('institutionId') institutionId: string) {
    return this.institutions.getInstitution(institutionId);
  }

  @Post('institutions/:institutionId/admins')
  inviteAdmin(
    @Param('institutionId') institutionId: string,
    @Body() body: unknown,
    @CurrentUser() user: RequestUser,
  ) {
    return this.institutions.inviteInstitutionAdmin(
      institutionId,
      InviteUserRequestSchema.parse(body),
      user.sub,
    );
  }

  @Get('institutions/:institutionId/admins')
  listAdmins(@Param('institutionId') institutionId: string) {
    return this.institutions.listInstitutionAdmins(institutionId);
  }

  @Post('invitations/:invitationId/resend')
  resendInvitation(@Param('invitationId') invitationId: string) {
    return this.institutions.resendAdminInvitation(invitationId);
  }
}
