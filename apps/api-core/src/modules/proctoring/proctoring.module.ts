import { Module } from '@nestjs/common';
import { ProctoringHeartbeatJob } from './heartbeat.job.js';
import { ProctoringController } from './proctoring.controller.js';
import { ProctoringService } from './proctoring.service.js';
import { ProctoringSnapshotConsumer } from './snapshot.consumer.js';

@Module({
  controllers: [ProctoringController],
  providers: [ProctoringService, ProctoringHeartbeatJob, ProctoringSnapshotConsumer],
  exports: [ProctoringService],
})
export class ProctoringModule {}
