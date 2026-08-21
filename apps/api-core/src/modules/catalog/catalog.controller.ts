import { Controller, Get, Param } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { Public } from '../../common/guards/public.decorator.js';
import type { CatalogService } from './catalog.service.js';

@Controller(`${API_PREFIX}/catalog`)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

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
}
