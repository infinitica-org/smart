import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/prisma/prisma.module.js';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { WorkExperienceController } from './work-experience.controller.js';
import { PublicWorkExperienceVerificationController } from './public-work-experience-verification.controller.js';
import { PublicWorkExperienceManagerSurveyController } from './public-work-experience-manager-survey.controller.js';
import { WorkExperienceAdminController } from './work-experience-admin.controller.js';
import { WorkExperienceService } from './work-experience.service.js';

import { EvidenceModule } from '../evidence/evidence.module.js';
import { InstitutionsModule } from '../institutions/institutions.module.js';
import { PublicProfileModule } from '../public-profile/public-profile.module.js';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    StorageModule,
    AiGatewayModule,
    InstitutionsModule,
    PublicProfileModule,
    EvidenceModule,
  ],
  controllers: [
    WorkExperienceController,
    PublicWorkExperienceVerificationController,
    PublicWorkExperienceManagerSurveyController,
    WorkExperienceAdminController,
  ],
  providers: [WorkExperienceService],
  exports: [WorkExperienceService],
})
export class WorkExperienceModule {}
