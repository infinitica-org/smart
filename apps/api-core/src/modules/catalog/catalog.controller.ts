import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  API_PREFIX,
  type CreateSkillDto,
  type DefineCompetenciesDto,
  type DefineProficiencyCriteriaDto,
  type MapSkillsToRoleDto,
  type MergeSkillsDto,
  type SkillQueryDto,
  type UpdateSkillDto,
} from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
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
  @Get('skills/se-v1')
  listSeSkills() {
    return this.catalog.listSeSkillLibrary();
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @UseGuards(RolesGuard)
  @Get('skills/manage')
  listManagedSkills(@Query() query?: SkillQueryDto) {
    return this.catalog.listManagedSkills(query);
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @UseGuards(RolesGuard)
  @Post('skills')
  createSkill(@Body() dto: CreateSkillDto) {
    return this.catalog.createSkill(dto);
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @UseGuards(RolesGuard)
  @Post('skills/merge')
  mergeSkills(@Body() dto: MergeSkillsDto) {
    return this.catalog.mergeSkills(dto);
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @UseGuards(RolesGuard)
  @Post('roles/map-skills')
  mapSkillsToRole(@Body() dto: MapSkillsToRoleDto) {
    return this.catalog.mapSkillsToRole(dto);
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @UseGuards(RolesGuard)
  @Post('skills/:skillCode/competencies')
  defineCompetencies(@Param('skillCode') skillCode: string, @Body() dto: DefineCompetenciesDto) {
    return this.catalog.defineCompetencies(skillCode, { ...dto, skillCode });
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @UseGuards(RolesGuard)
  @Post('skills/:skillCode/proficiency-criteria')
  defineProficiencyCriteria(
    @Param('skillCode') skillCode: string,
    @Body() dto: DefineProficiencyCriteriaDto,
  ) {
    return this.catalog.defineProficiencyCriteria(skillCode, { ...dto, skillCode });
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN')
  @UseGuards(RolesGuard)
  @Put('skills/:skillCode')
  updateSkill(@Param('skillCode') skillCode: string, @Body() dto: UpdateSkillDto) {
    return this.catalog.updateSkill(skillCode, dto);
  }

  @Roles('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PLACEMENT_STAFF', 'STUDENT')
  @UseGuards(RolesGuard)
  @Get('skills/:skillCode/versions')
  getSkillVersions(@Param('skillCode') skillCode: string) {
    return this.catalog.getSkillVersions(skillCode);
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
}
