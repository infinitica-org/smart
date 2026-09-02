import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { MeApplicationsController } from './me-applications.controller.js';
import { PlacementController } from './placement.controller.js';
import { PlacementService } from './placement.service.js';

@Module({
  controllers: [PlacementController, MeApplicationsController],
  providers: [PlacementService, ApplicationsService],
  exports: [PlacementService, ApplicationsService],
})
export class PlacementModule {}
