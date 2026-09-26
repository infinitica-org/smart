import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_PREFIX, StudentEventsQuerySchema } from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { EventRegistrationsService } from './event-registrations.service.js';

/** Th6-450 / 451 — event discovery and registration for students and (approved) employers. */
@ApiTags('events')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/events`)
@Roles('STUDENT', 'COMPANY')
export class EventsController {
  constructor(
    @Inject(EventRegistrationsService) private readonly events: EventRegistrationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Upcoming published events from the caller own university, soonest first.',
  })
  list(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.events.list(
      user,
      StudentEventsQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'One event the caller may see.' })
  get(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.getVisible(user, id);
  }

  @Post(':id/registrations')
  @ApiOperation({
    summary: 'Register (or join the waitlist). Registering twice returns the same registration.',
  })
  register(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.register(user, id);
  }

  @Delete(':id/registrations')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancel your own registration; the oldest waitlisted person is promoted.',
  })
  cancel(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.cancelRegistration(user, id);
  }
}
