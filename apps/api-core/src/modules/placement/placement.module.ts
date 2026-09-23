import { Module } from '@nestjs/common';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { MatchingModule } from '../matching/matching.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { MeApplicationsController } from './me-applications.controller.js';
import { PlacementController } from './placement.controller.js';
import { PlacementEmployersService } from './placement-employers.service.js';
import { PlacementService } from './placement.service.js';

@Module({
  imports: [StorageModule, MatchingModule, EvidenceModule],
  controllers: [PlacementController, MeApplicationsController],
  providers: [PlacementService, PlacementEmployersService],
  exports: [PlacementService, PlacementEmployersService],
})
export class PlacementModule {}
