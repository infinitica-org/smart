import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { Roles } from '../../common/guards/roles.decorator.js';
import { InstitutionsService } from './institutions.service.js';

@Controller(`${API_PREFIX}/plans`)
@Roles('COMPANY', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'SUPER_ADMIN')
export class PlansController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Get()
  listPlans() {
    return this.institutions.listPlans();
  }
}
