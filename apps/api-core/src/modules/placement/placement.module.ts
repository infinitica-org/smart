import { Module } from '@nestjs/common';
import { StorageModule } from '../../platform/storage/storage.module.js';
import { MatchingModule } from '../matching/matching.module.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { MeApplicationsController } from './me-applications.controller.js';
import { PlacementCalendarController } from './placement-calendar.controller.js';
import { PlacementCalendarService } from './placement-calendar.service.js';
import { PlacementController } from './placement.controller.js';
import { PlacementEmployersService } from './placement-employers.service.js';
import { PlacementService } from './placement.service.js';

@Module({
  imports: [StorageModule, MatchingModule, EvidenceModule, ApplicationsModule],
  controllers: [PlacementController, MeApplicationsController, PlacementCalendarController],
  providers: [PlacementService, PlacementEmployersService, PlacementCalendarService],
  exports: [PlacementService, PlacementEmployersService, PlacementCalendarService],
})
export class PlacementModule {}
