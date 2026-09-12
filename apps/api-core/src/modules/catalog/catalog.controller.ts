import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { EvidenceCatalogService } from '../evidence/evidence-catalog.service.js';
import { CatalogService } from './catalog.service.js';

@Controller(`${API_PREFIX}/catalog`)
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(EvidenceCatalogService) private readonly evidenceCatalog: EvidenceCatalogService,
  ) {}

  @Public()
  @Get('tracks')
  list() {
    return this.catalog.listTracks();
  }

  @Public()
  @Get('tracks/:trackCode')
  get(@Param('trackCode') trackCode: string) {
    return this.catalog.getTrack(trackCode);
  }

  @Public()
  @Get('skills')
  listSkills() {
    return this.catalog.listSkillLibrary();
  }

  @Public()
  @Get('career-domains')
  listCareerDomains() {
    return this.evidenceCatalog.listCareerDomains();
  }

  @Public()
  @Get('target-roles')
  listTargetRoles(@Query('domainId') domainId?: string) {
    return this.evidenceCatalog.listTargetRoles(domainId);
  }

  @Public()
  @Get('target-roles/:roleId/recommended-skills')
  recommendedSkills(@Param('roleId') roleId: string) {
    return this.evidenceCatalog.getRecommendedSkills(roleId);
  }

  @Public()
  @Get('skills/:skillCode/blueprint')
  skillBlueprint(@Param('skillCode') skillCode: string) {
    return this.evidenceCatalog.getSkillBlueprint(skillCode);
  }

  @Public()
  @Get('skills/se-v1')
  listSeSkills() {
    return this.catalog.listSeSkillLibrary();
  }
}
