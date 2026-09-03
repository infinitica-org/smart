import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/prisma/prisma.module.js';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { WorkExperienceController } from './work-experience.controller.js';
import { PublicWorkExperienceVerificationController } from './public-work-experience-verification.controller.js';
import { WorkExperienceService } from './work-experience.service.js';

@Module({
  imports: [PrismaModule, AuditModule, AiGatewayModule],
  controllers: [WorkExperienceController, PublicWorkExperienceVerificationController],
  providers: [WorkExperienceService],
  exports: [WorkExperienceService],
})
export class WorkExperienceModule {}
