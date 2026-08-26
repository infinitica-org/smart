import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module.js';
import { InstitutionsAdminController } from './institutions-admin.controller.js';
import { InstitutionsTpoController } from './institutions-tpo.controller.js';
import { InstitutionsService } from './institutions.service.js';

@Module({
  imports: [InvitationsModule],
  controllers: [InstitutionsAdminController, InstitutionsTpoController],
  providers: [InstitutionsService],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
