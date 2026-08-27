import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { EvaluationService } from './evaluation.service.js';

@Controller(`${API_PREFIX}/evaluation`)
export class EvaluationController {
  constructor(@Inject(EvaluationService) private readonly service: EvaluationService) {}

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
