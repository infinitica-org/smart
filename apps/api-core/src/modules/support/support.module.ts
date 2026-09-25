import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
