import { Controller, Get } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import type { CalibrationService } from './calibration.service.js';

@Controller(`${API_PREFIX}/calibration`)
export class CalibrationController {
  constructor(private readonly service: CalibrationService) {}

  @Get('_meta')
  meta() {
    return {
      module: 'calibration',
      owner: this.service.owner,
      purpose: this.service.purpose,
      status: 'scaffold',
    };
  }
}
