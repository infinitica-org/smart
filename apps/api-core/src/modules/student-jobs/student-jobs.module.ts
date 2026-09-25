import { Module } from '@nestjs/common';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { ReadinessModule } from '../readiness/readiness.module.js';
import { JobReportsService } from './job-reports.service.js';
import { ReportsController } from './reports.controller.js';
import { StudentJobsController } from './student-jobs.controller.js';
import { StudentJobsService } from './student-jobs.service.js';

@Module({
  imports: [ReadinessModule],
  controllers: [StudentJobsController, ReportsController],
  providers: [StudentJobsService, JobReportsService, IdempotencyService],
})
export class StudentJobsModule {}
