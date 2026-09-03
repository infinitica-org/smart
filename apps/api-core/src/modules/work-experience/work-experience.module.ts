import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/prisma/prisma.module.js';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { WorkExperienceController } from './work-experience.controller.js';
import { WorkExperienceService } from './work-experience.service.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [WorkExperienceController],
  providers: [WorkExperienceService],
  exports: [WorkExperienceService],
})
export class WorkExperienceModule {}
