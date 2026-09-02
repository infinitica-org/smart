import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { PlacementMatchController } from './placement-match.controller.js';

@Module({
  controllers: [MatchingController, PlacementMatchController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
