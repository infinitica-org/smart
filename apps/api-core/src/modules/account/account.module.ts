import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
