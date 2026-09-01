import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { CompaniesAdminController } from './companies-admin.controller.js';
import { CompaniesService } from './companies.service.js';
import { InstitutionsAdminController } from './institutions-admin.controller.js';
import { InstitutionsTpoController } from './institutions-tpo.controller.js';
import { InstitutionsService } from './institutions.service.js';

@Module({
  imports: [InvitationsModule],
  controllers: [InstitutionsAdminController, InstitutionsTpoController, CompaniesAdminController],
  providers: [InstitutionsService, CompaniesService],
  exports: [InstitutionsService, CompaniesService],
})
export class InstitutionsModule {}
