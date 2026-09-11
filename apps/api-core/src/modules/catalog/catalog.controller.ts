import { Controller, Get, Inject, Param } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import { CatalogService } from './catalog.service.js';

@Controller(`${API_PREFIX}/catalog`)
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

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
}
