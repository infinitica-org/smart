import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';
import { ItemRotationService } from './item-rotation.service.js';

@Module({
  controllers: [AssessmentController],
  providers: [AssessmentService, ItemRotationService],
  exports: [AssessmentService, ItemRotationService],
})
export class AssessmentModule {}
