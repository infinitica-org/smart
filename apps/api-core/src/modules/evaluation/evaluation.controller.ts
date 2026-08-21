import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { EvaluationService } from './evaluation.service.js';

@Controller(`${API_PREFIX}/evaluation`)
export class EvaluationController {
  constructor(private readonly service: EvaluationService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'evaluation',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
