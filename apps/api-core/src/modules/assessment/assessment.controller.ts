import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { API_PREFIX } from '@smart/contracts';
import type { AssessmentService } from './assessment.service.js';

@ApiTags('assessment')
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
