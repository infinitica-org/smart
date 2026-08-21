import { Module } from '@nestjs/common';
import { SandboxController } from './sandbox.controller.js';
import { SandboxService } from './sandbox.service.js';

@Module({
  controllers: [SandboxController],
  providers: [SandboxService],
  exports: [SandboxService],
})
export class SandboxModule {}
