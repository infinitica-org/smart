import { Controller, ForbiddenException, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { InstitutionsService } from './institutions.service.js';

@Controller(`${API_PREFIX}/student`)
@Roles('STUDENT')
export class InstitutionsStudentController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Get('entitlements')
  entitlements(@CurrentUser() user: RequestUser) {
    if (!user.inst) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Student must belong to an institution.',
        statusCode: 403,
      });
    }
    return this.institutions.resolveInstitutionEntitlements(user.inst);
  }
}
