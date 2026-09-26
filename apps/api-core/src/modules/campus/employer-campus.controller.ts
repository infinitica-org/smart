import { Body, Controller, Get, Headers, Inject, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  CreateCampusAccessRequestSchema,
  StudentEventsQuerySchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { CampusAccessService } from './campus-access.service.js';
import { EventRegistrationsService } from './event-registrations.service.js';

/** Th6-445 / Th6-450 — the employer's side of campus access and university events. */
@ApiTags('employer-campus')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/employer`)
@Roles('COMPANY')
export class EmployerCampusController {
  constructor(
    @Inject(CampusAccessService) private readonly access: CampusAccessService,
    @Inject(EventRegistrationsService) private readonly events: EventRegistrationsService,
  ) {}

  @Get('campus-access')
  @ApiOperation({ summary: 'Partner universities with this employer request status at each.' })
  list(@CurrentUser() user: RequestUser) {
    return this.access.listForEmployer(user.sub);
  }

  @Post('campus-access')
  @ApiOperation({
    summary: 'Request campus access (verified employers only). Idempotency-Key required.',
  })
  request(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.access.requestAccess(
      user.sub,
      IdempotencyService.requireKey(key),
      CreateCampusAccessRequestSchema.parse(body),
    );
  }

  @Get('events')
  @ApiOperation({ summary: 'Upcoming events at universities where this employer is approved.' })
  listEvents(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.events.list(
      user,
      StudentEventsQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }
}
