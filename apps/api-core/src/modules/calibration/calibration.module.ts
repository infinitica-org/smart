import { Module } from '@nestjs/common';
import { CalibrationController } from './calibration.controller.js';
import { CalibrationService } from './calibration.service.js';

@Module({
  controllers: [CalibrationController],
  providers: [CalibrationService],
  exports: [CalibrationService],
})
export class CalibrationModule {}
