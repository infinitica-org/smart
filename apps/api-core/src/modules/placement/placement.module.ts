import { Module } from '@nestjs/common';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { MeApplicationsController } from './me-applications.controller.js';
import { PlacementController } from './placement.controller.js';
import { PlacementService } from './placement.service.js';

@Module({
  imports: [StorageModule],
  controllers: [PlacementController, MeApplicationsController],
  providers: [PlacementService],
  exports: [PlacementService],
})
export class PlacementModule {}
