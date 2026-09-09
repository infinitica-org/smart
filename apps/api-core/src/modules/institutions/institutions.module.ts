import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { CompaniesAdminController } from './companies-admin.controller.js';
import { CompaniesService } from './companies.service.js';
import { InstitutionsAdminController } from './institutions-admin.controller.js';
import { InstitutionsStudentController } from './institutions-student.controller.js';
import { InstitutionsTpoController } from './institutions-tpo.controller.js';
import { InstitutionsService } from './institutions.service.js';

import { OrganizationsService } from './organizations.service.js';

@Module({
  imports: [InvitationsModule],
  controllers: [
    InstitutionsAdminController,
    InstitutionsTpoController,
    InstitutionsStudentController,
    CompaniesAdminController,
  ],
  providers: [InstitutionsService, CompaniesService, OrganizationsService],
  exports: [InstitutionsService, CompaniesService, OrganizationsService],
})
export class InstitutionsModule {}
