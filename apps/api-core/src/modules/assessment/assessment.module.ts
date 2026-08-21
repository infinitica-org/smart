import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';

@Module({
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
