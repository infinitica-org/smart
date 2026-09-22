import { Module } from '@nestjs/common';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { CompaniesAdminController } from './companies-admin.controller.js';
import { CompanyOnboardingDocumentService } from './company-onboarding-document.service.js';
import { CompanyOnboardingService } from './company-onboarding.service.js';
import { CompaniesService } from './companies.service.js';
import { PublicCompanyOnboardingController } from './public-company-onboarding.controller.js';
import { InstitutionsAdminController } from './institutions-admin.controller.js';
import { InstitutionsStudentController } from './institutions-student.controller.js';
import { InstitutionsTpoController } from './institutions-tpo.controller.js';
import { InstitutionsService } from './institutions.service.js';

import { OrganizationsService } from './organizations.service.js';

@Module({
  imports: [InvitationsModule, StorageModule],
  controllers: [
    InstitutionsAdminController,
    InstitutionsTpoController,
    InstitutionsStudentController,
    CompaniesAdminController,
    PublicCompanyOnboardingController,
  ],
  providers: [
    InstitutionsService,
    CompaniesService,
    OrganizationsService,
    CompanyOnboardingDocumentService,
    CompanyOnboardingService,
  ],
  exports: [
    InstitutionsService,
    CompaniesService,
    OrganizationsService,
    CompanyOnboardingDocumentService,
    CompanyOnboardingService,
  ],
})
export class InstitutionsModule {}
