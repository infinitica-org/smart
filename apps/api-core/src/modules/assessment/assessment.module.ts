import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller.js';
import { AssessmentService } from './assessment.service.js';
import { IntegrityAdminController } from './integrity-admin.controller.js';
import { ItemRotationService } from './item-rotation.service.js';

@Module({
  controllers: [AssessmentController, IntegrityAdminController],
  providers: [AssessmentService, ItemRotationService],
  exports: [AssessmentService, ItemRotationService],
})
export class AssessmentModule {}
