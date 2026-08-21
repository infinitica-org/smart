import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';

@Module({
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
