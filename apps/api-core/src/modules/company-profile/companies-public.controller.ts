import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { CompanyProfileService } from './company-profile.service.js';

@ApiTags('company-profile')
@Controller(`${API_PREFIX}/companies`)
export class CompaniesPublicController {
  constructor(@Inject(CompanyProfileService) private readonly profiles: CompanyProfileService) {}

  @Public()
  @Get(':orgId')
  @ApiOperation({ summary: 'Public company profile (id or slug); 404 unless verified.' })
  getPublic(@Param('orgId') orgId: string) {
    return this.profiles.getPublic(orgId);
  }
}
