import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { EvaluationModule } from '../evaluation/evaluation.module.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [EvaluationModule, AuditModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
