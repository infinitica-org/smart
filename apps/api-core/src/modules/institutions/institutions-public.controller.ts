import { Controller, Get, Inject, Query } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { InstitutionsService } from './institutions.service.js';

@Controller(`${API_PREFIX}/public`)
export class InstitutionsPublicController {
  constructor(@Inject(InstitutionsService) private readonly institutions: InstitutionsService) {}

  @Public()
  @Get('partner-universities')
  listPartnerUniversities(@Query('q') q?: string) {
    return this.institutions.listPartnerUniversities({ q });
  }
}
