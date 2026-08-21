import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { PlacementService } from './placement.service.js';

@Controller(`${API_PREFIX}/placement`)
export class PlacementController {
  constructor(private readonly service: PlacementService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'placement',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
