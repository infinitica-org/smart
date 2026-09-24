import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
