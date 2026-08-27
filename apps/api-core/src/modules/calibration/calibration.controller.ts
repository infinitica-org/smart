import { Controller, Get, Inject } from '@nestjs/common';
import { API_PREFIX } from '@smart/contracts';
import { CalibrationService } from './calibration.service.js';

@Controller(`${API_PREFIX}/calibration`)
export class CalibrationController {
  constructor(@Inject(CalibrationService) private readonly service: CalibrationService) {}

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
