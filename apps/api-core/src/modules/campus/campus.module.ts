import { Module } from '@nestjs/common';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { CampusAccessService } from './campus-access.service.js';
import { CareerEventsService } from './career-events.service.js';
import { EmployerCampusController } from './employer-campus.controller.js';
import { EventRegistrationsService } from './event-registrations.service.js';
import { EventsController } from './events.controller.js';
import { UniversityCampusController } from './university-campus.controller.js';
import { UniversityEventsController } from './university-events.controller.js';

/** UNI-05 — employer campus access and career events (Th6-445 to Th6-451). */
@Module({
  controllers: [
    EmployerCampusController,
    UniversityCampusController,
    UniversityEventsController,
    EventsController,
  ],
  providers: [
    IdempotencyService,
    CampusAccessService,
    CareerEventsService,
    EventRegistrationsService,
  ],
})
export class CampusModule {}
