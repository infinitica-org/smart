import { Module } from '@nestjs/common';
import { MeApplicationsController } from './me-applications.controller.js';
import { PlacementController } from './placement.controller.js';
import { PlacementService } from './placement.service.js';

@Module({
  controllers: [PlacementController, MeApplicationsController],
  providers: [PlacementService],
  exports: [PlacementService],
})
export class PlacementModule {}
