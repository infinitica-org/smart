import { Module } from '@nestjs/common';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { DataExportService } from './data-export.service.js';
import { DsrExportProcessor } from './dsr-export.processor.js';

@Module({
  imports: [AuthModule, StorageModule, NotificationsModule],
  controllers: [AccountController],
  providers: [AccountService, DataExportService, DsrExportProcessor],
})
export class AccountModule {}
