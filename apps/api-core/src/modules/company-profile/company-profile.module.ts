import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { CompanyProfileService } from './company-profile.service.js';
import { CompanyReviewsService } from './company-reviews.service.js';
import { CompanyTeamService } from './company-team.service.js';
import { CompaniesPublicController } from './companies-public.controller.js';
import { EmployerController } from './employer.controller.js';
import { IdempotencyService } from './idempotency.service.js';
import { LocationSearchService } from './location-search.service.js';
import { LocationsController } from './locations.controller.js';

@Module({
  imports: [InvitationsModule],
  controllers: [CompaniesPublicController, EmployerController, LocationsController],
  providers: [
    CompanyProfileService,
    CompanyReviewsService,
    CompanyTeamService,
    IdempotencyService,
    LocationSearchService,
  ],
})
export class CompanyProfileModule {}
