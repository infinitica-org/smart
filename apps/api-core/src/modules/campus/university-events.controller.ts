import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  API_PREFIX,
  CancelCareerEventSchema,
  CreateCareerEventSchema,
  UniversityEventsQuerySchema,
  UpdateCareerEventSchema,
} from '@smart/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { CareerEventsService } from './career-events.service.js';

/** If-Match of "3", W/"3" or 3 gives 3. Missing is 428, malformed is 400. */
export function parseEventVersion(header: string | undefined): number {
  if (!header?.trim()) {
    throw new HttpException(
      {
        error: 'precondition_required',
        message: 'Send an If-Match header with the event version you loaded.',
        statusCode: 428,
      },
      428,
    );
  }
  const version = Number(header.trim().replace(/^W\//, '').replace(/"/g, ''));
  if (!Number.isInteger(version) || version < 1) {
    throw new BadRequestException({
      error: 'validation_failed',
      message: 'If-Match must be the numeric event version.',
      statusCode: 400,
    });
  }
  return version;
}

/** Th6-448 / 449 — career events managed by university staff. */
@ApiTags('university-events')
@ApiBearerAuth()
@Controller(`${API_PREFIX}/university/events`)
@UseGuards(TenantScopeGuard)
@Roles('INSTITUTION_ADMIN', 'PLACEMENT_STAFF')
export class UniversityEventsController {
  constructor(@Inject(CareerEventsService) private readonly events: CareerEventsService) {}

  @Get()
  @ApiOperation({ summary: 'This university events, cursor paged.' })
  list(@CurrentUser() user: RequestUser, @Query() query: Record<string, string | undefined>) {
    return this.events.list(
      user,
      UniversityEventsQuerySchema.parse(
        Object.fromEntries(Object.entries(query).filter(([, value]) => value)),
      ),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a DRAFT event. Idempotency-Key required.' })
  create(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.events.create(
      user,
      IdempotencyService.requireKey(key),
      CreateCareerEventSchema.parse(body),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Event detail with registrants.' })
  get(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.get(user, id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'DRAFT to PUBLISHED. Publishing again is a no-op.' })
  publish(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.publish(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an event. If-Match carries the version; a stale one is a 409.' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: unknown,
  ) {
    return this.events.update(
      user,
      id,
      parseEventVersion(ifMatch),
      UpdateCareerEventSchema.parse(body),
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an event with a reason. Registrants are notified once.' })
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.events.cancel(user, id, CancelCareerEventSchema.parse(body));
  }
}
