import { Module } from '@nestjs/common';
import { PlacementController } from './placement.controller.js';
import { PlacementService } from './placement.service.js';

@Module({
  controllers: [PlacementController],
  providers: [PlacementService],
  exports: [PlacementService],
})
export class PlacementModule {}
