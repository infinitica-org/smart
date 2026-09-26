import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type {
  CancelCareerEvent,
  CareerEventDto,
  CreateCareerEvent,
  EventRegistrant,
  UniversityEventDetail,
  UniversityEventsQuery,
  UniversityEventsResponse,
  UpdateCareerEvent,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import {
  createNotices,
  notFound,
  staffScope,
  unprocessable,
  writeAudit,
  type Db,
} from './campus-shared.js';
import { ACTIVE_REGISTRATION_STATUSES, fillFreeSeats, lockEvent } from './event-seats.js';

type EventRow = Prisma.CareerEventGetPayload<object>;

interface SeatCounts {
  registered: number;
  waitlisted: number;
}

export function toEventDto(row: EventRow, counts: SeatCounts): CareerEventDto {
  return {
    id: row.id,
    institutionId: row.institutionId,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timezone: row.timezone,
    location: row.location,
    onlineUrl: row.onlineUrl,
    capacity: row.capacity,
    audience: row.audience,
    employerRegistration: row.employerRegistration,
    status: row.status,
    cancelReason: row.cancelReason,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    registeredCount: counts.registered,
    waitlistedCount: counts.waitlisted,
  };
}

/** The fields whose change registrants must hear about. */
const NOTIFY_FIELDS = ['startsAt', 'endsAt', 'timezone', 'location', 'onlineUrl'] as const;

function snapshot(row: EventRow) {
  return {
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timezone: row.timezone,
    location: row.location,
    onlineUrl: row.onlineUrl,
    capacity: row.capacity,
    audience: row.audience,
    employerRegistration: row.employerRegistration,
    status: row.status,
    version: row.version,
  };
}

/** Th6-448 / 449 — career events managed by university staff. */
@Injectable()
export class CareerEventsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  async seatCounts(db: Pick<PrismaService, 'eventRegistration'>, eventIds: string[]) {
    const counts = new Map<string, SeatCounts>();
    if (eventIds.length === 0) return counts;
    const groups = await db.eventRegistration.groupBy({
      by: ['eventId', 'status'],
      where: { eventId: { in: eventIds }, status: { in: ['REGISTERED', 'WAITLISTED'] } },
      _count: { _all: true },
    });
    for (const group of groups) {
      const entry = counts.get(group.eventId) ?? { registered: 0, waitlisted: 0 };
      if (group.status === 'REGISTERED') entry.registered = group._count._all;
      else entry.waitlisted = group._count._all;
      counts.set(group.eventId, entry);
    }
    return counts;
  }

  /** Th6-448: creates a DRAFT. A retry with the same Idempotency-Key returns the original event. */
  async create(user: RequestUser, key: string, body: CreateCareerEvent): Promise<CareerEventDto> {
    const scope = staffScope(user);
    if (Date.parse(body.startsAt) <= Date.now()) {
      throw unprocessable('validation_failed', 'The event must start in the future.', 'startsAt');
    }
    return this.idempotency.run<CareerEventDto>({
      userId: scope.userId,
      scope: 'university.events.create',
      key,
      request: body,
      execute: async (tx) => {
        const created = await tx.careerEvent.create({
          data: {
            institutionId: scope.institutionId,
            title: body.title,
            description: body.description,
            startsAt: new Date(body.startsAt),
            endsAt: new Date(body.endsAt),
            timezone: body.timezone,
            location: body.location?.trim() || null,
            onlineUrl: body.onlineUrl ?? null,
            capacity: body.capacity ?? null,
            audience: body.audience,
            employerRegistration: body.employerRegistration,
            createdById: scope.userId,
          },
        });
        await writeAudit(tx, {
          actorId: scope.userId,
          action: 'career_event.created',
          resourceType: 'career_event',
          resourceId: created.id,
          orgId: scope.institutionId,
          before: null,
          after: snapshot(created),
        });
        return { result: toEventDto(created, { registered: 0, waitlisted: 0 }) };
      },
    });
  }

  async list(user: RequestUser, query: UniversityEventsQuery): Promise<UniversityEventsResponse> {
    const scope = staffScope(user);
    const rows = await this.prisma.careerEvent.findMany({
      where: {
        institutionId: scope.institutionId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, query.limit);
    const counts = await this.seatCounts(
      this.prisma,
      page.map((row) => row.id),
    );
    return {
      events: page.map((row) =>
        toEventDto(row, counts.get(row.id) ?? { registered: 0, waitlisted: 0 }),
      ),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /** Detail plus the registrant list. Another institution's event is a 404. */
  async get(user: RequestUser, eventId: string): Promise<UniversityEventDetail> {
    const scope = staffScope(user);
    const row = await this.prisma.careerEvent.findFirst({
      where: { id: eventId, institutionId: scope.institutionId },
    });
    if (!row) throw notFound('Event not found.');
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId, status: { in: ['REGISTERED', 'WAITLISTED'] } },
      orderBy: [{ registeredAt: 'asc' }, { id: 'asc' }],
    });
    const userIds = registrations.map((registration) => registration.userId);
    const companyIds = [
      ...new Set(registrations.map((r) => r.companyId).filter((id): id is string => !!id)),
    ];
    const [users, companies] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true },
          })
        : [],
      companyIds.length
        ? this.prisma.company.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);
    const names = new Map(users.map((entry) => [entry.id, entry.fullName]));
    const companyNames = new Map(companies.map((entry) => [entry.id, entry.name]));
    const registrants: EventRegistrant[] = registrations.map((registration) => ({
      registrationId: registration.id,
      fullName: names.get(registration.userId) ?? 'Unknown',
      kind: registration.companyId ? 'EMPLOYER' : 'STUDENT',
      companyName: registration.companyId
        ? (companyNames.get(registration.companyId) ?? null)
        : null,
      status: registration.status,
      registeredAt: registration.registeredAt.toISOString(),
    }));
    const registered = registrants.filter((entry) => entry.status === 'REGISTERED').length;
    return {
      event: toEventDto(row, { registered, waitlisted: registrants.length - registered }),
      registrants,
    };
  }

  /** Th6-449: DRAFT to PUBLISHED. Publishing twice returns the same published event. */
  async publish(user: RequestUser, eventId: string): Promise<CareerEventDto> {
    const scope = staffScope(user);
    return this.prisma.$transaction(async (tx) => {
      const event = await this.loadOwned(tx, scope.institutionId, eventId);
      if (event.status === 'PUBLISHED') return this.dtoIn(tx, event);
      if (event.status === 'CANCELLED') {
        throw unprocessable('event_cancelled', 'A cancelled event cannot be published again.');
      }
      if (event.startsAt.getTime() <= Date.now()) {
        throw unprocessable('validation_failed', 'The event has already started.', 'startsAt');
      }
      const moved = await tx.careerEvent.updateMany({
        where: { id: eventId, status: 'DRAFT' },
        data: { status: 'PUBLISHED', version: { increment: 1 } },
      });
      const after = await tx.careerEvent.findUniqueOrThrow({ where: { id: eventId } });
      if (moved.count > 0) {
        await writeAudit(tx, {
          actorId: scope.userId,
          action: 'career_event.published',
          resourceType: 'career_event',
          resourceId: eventId,
          orgId: scope.institutionId,
          before: snapshot(event),
          after: snapshot(after),
        });
      }
      return this.dtoIn(tx, after);
    });
  }

  /**
   * Th6-449: edit under optimistic locking. A stale If-Match is a 409, a cancelled event is a 422, and a
   * change to time or place of a PUBLISHED event notifies each registrant once per version.
   */
  async update(
    user: RequestUser,
    eventId: string,
    ifMatchVersion: number,
    body: UpdateCareerEvent,
  ): Promise<CareerEventDto> {
    const scope = staffScope(user);
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const event = await this.loadOwned(tx, scope.institutionId, eventId);
      if (event.status === 'CANCELLED') {
        throw unprocessable('event_cancelled', 'A cancelled event cannot be edited.');
      }
      if (event.version !== ifMatchVersion) throw versionConflict();

      const next = {
        title: body.title ?? event.title,
        description: body.description ?? event.description,
        startsAt: body.startsAt ? new Date(body.startsAt) : event.startsAt,
        endsAt: body.endsAt ? new Date(body.endsAt) : event.endsAt,
        timezone: body.timezone ?? event.timezone,
        location: body.location === undefined ? event.location : body.location?.trim() || null,
        onlineUrl: body.onlineUrl === undefined ? event.onlineUrl : body.onlineUrl || null,
        capacity: body.capacity === undefined ? event.capacity : body.capacity,
        audience: body.audience ?? event.audience,
        employerRegistration: body.employerRegistration ?? event.employerRegistration,
      };
      if (next.endsAt <= next.startsAt) {
        throw unprocessable('validation_failed', 'End must be after the start.', 'endsAt');
      }
      if (body.startsAt && next.startsAt.getTime() <= Date.now()) {
        throw unprocessable('validation_failed', 'The event must start in the future.', 'startsAt');
      }
      if (!next.location && !next.onlineUrl) {
        throw unprocessable('validation_failed', 'Give a location or an online link.', 'location');
      }
      if (next.capacity !== null) {
        const registered = await tx.eventRegistration.count({
          where: { eventId, status: 'REGISTERED' },
        });
        if (next.capacity < registered) {
          throw unprocessable(
            'validation_failed',
            `Capacity cannot be below the ${registered} people already registered.`,
            'capacity',
          );
        }
      }

      const moved = await tx.careerEvent.updateMany({
        where: { id: eventId, version: ifMatchVersion },
        data: { ...next, version: { increment: 1 } },
      });
      if (moved.count === 0) throw versionConflict();
      const after = await tx.careerEvent.findUniqueOrThrow({ where: { id: eventId } });

      const changed = NOTIFY_FIELDS.filter(
        (field) => snapshot(event)[field] !== snapshot(after)[field],
      );
      if (event.status === 'PUBLISHED' && changed.length > 0) {
        await this.notifyRegistrants(tx, after, {
          dedupePrefix: `event:${eventId}:v${after.version}:changed`,
          title: `Event updated: ${after.title}`,
          body: `The ${changed.join(', ')} of this event changed. Please check the new details.`,
        });
      }
      if (event.status === 'PUBLISHED' && after.capacity !== event.capacity) {
        await fillFreeSeats(tx, after, `capacity:v${after.version}`);
      }
      await writeAudit(tx, {
        actorId: scope.userId,
        action: 'career_event.updated',
        resourceType: 'career_event',
        resourceId: eventId,
        orgId: scope.institutionId,
        before: snapshot(event),
        after: snapshot(after),
      });
      return this.dtoIn(tx, after);
    });
  }

  /** Th6-449: cancel with a reason; every registrant is told once. Cancelling twice changes nothing. */
  async cancel(
    user: RequestUser,
    eventId: string,
    body: CancelCareerEvent,
  ): Promise<CareerEventDto> {
    const scope = staffScope(user);
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const event = await this.loadOwned(tx, scope.institutionId, eventId);
      if (event.status === 'CANCELLED') return this.dtoIn(tx, event);
      await tx.careerEvent.update({
        where: { id: eventId },
        data: { status: 'CANCELLED', cancelReason: body.reason, version: { increment: 1 } },
      });
      const after = await tx.careerEvent.findUniqueOrThrow({ where: { id: eventId } });
      await this.notifyRegistrants(tx, after, {
        dedupePrefix: `event:${eventId}:cancelled`,
        title: `Event cancelled: ${after.title}`,
        body: `This event was cancelled: ${body.reason}`,
      });
      await writeAudit(tx, {
        actorId: scope.userId,
        action: 'career_event.cancelled',
        resourceType: 'career_event',
        resourceId: eventId,
        orgId: scope.institutionId,
        reason: body.reason,
        before: snapshot(event),
        after: snapshot(after),
      });
      return this.dtoIn(tx, after);
    });
  }

  private async loadOwned(tx: Db, institutionId: string, eventId: string): Promise<EventRow> {
    const event = await tx.careerEvent.findFirst({ where: { id: eventId, institutionId } });
    if (!event) throw notFound('Event not found.');
    return event;
  }

  private async dtoIn(tx: Db, row: EventRow): Promise<CareerEventDto> {
    const counts = await this.seatCounts(tx as unknown as PrismaService, [row.id]);
    return toEventDto(row, counts.get(row.id) ?? { registered: 0, waitlisted: 0 });
  }

  private async notifyRegistrants(
    tx: Db,
    event: EventRow,
    notice: { dedupePrefix: string; title: string; body: string },
  ): Promise<void> {
    const registrations = await tx.eventRegistration.findMany({
      where: { eventId: event.id, status: { in: [...ACTIVE_REGISTRATION_STATUSES] } },
      select: { userId: true },
    });
    await createNotices(
      tx,
      registrations.map((registration) => ({
        userId: registration.userId,
        kind: 'EVENT' as const,
        title: notice.title,
        body: notice.body,
        linkUrl: `/events/${event.id}`,
        dedupeKey: `${notice.dedupePrefix}:${registration.userId}`,
        metadata: { eventId: event.id, version: event.version },
      })),
    );
  }
}

function versionConflict() {
  return new ConflictException({
    error: 'version_conflict',
    message: 'This event was changed by someone else. Reload it and try again.',
    statusCode: 409,
  });
}
