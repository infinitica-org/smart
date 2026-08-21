import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { AssessmentService } from './assessment.service.js';

@Controller(`${API_PREFIX}/assessment`)
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'assessment',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
