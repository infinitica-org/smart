import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { MatchingService } from './matching.service.js';

@Controller(`${API_PREFIX}/matching`)
export class MatchingController {
  constructor(private readonly service: MatchingService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'matching',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
