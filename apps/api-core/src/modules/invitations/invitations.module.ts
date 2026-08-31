import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service.js';

@Module({
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
