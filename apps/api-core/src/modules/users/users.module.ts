import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module.js';
import { AssessmentModule } from '../assessment/assessment.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { GeocodingIntegrationModule } from '../integrations/geocoding/geocoding-integration.module.js';
import { GithubIntegrationModule } from '../integrations/github/github-integration.module.js';
import { CandidateEducationController } from '../candidate-education/candidate-education.controller.js';
import { CandidateEducationTpoController } from '../candidate-education/candidate-education-tpo.controller.js';
import { CandidateEducationService } from '../candidate-education/candidate-education.service.js';
import { CandidateLanguagesController } from '../candidate-languages/candidate-languages.controller.js';
import { CandidateLanguagesService } from '../candidate-languages/candidate-languages.service.js';
import { ProfileCompletionService } from './profile-completion.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    AuthModule,
    AiGatewayModule,
    GithubIntegrationModule,
    GeocodingIntegrationModule,
    AssessmentModule,
  ],
  controllers: [
    UsersController,
    CandidateEducationController,
    CandidateEducationTpoController,
    CandidateLanguagesController,
  ],
  providers: [
    UsersService,
    CandidateEducationService,
    CandidateLanguagesService,
    ProfileCompletionService,
  ],
  exports: [
    UsersService,
    CandidateEducationService,
    CandidateLanguagesService,
    ProfileCompletionService,
  ],
})
export class UsersModule {}
