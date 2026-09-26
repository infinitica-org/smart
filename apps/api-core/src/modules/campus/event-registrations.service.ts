import { Inject, Injectable } from '@nestjs/common';
import type {
  EventRegistrationDto,
  EventRegistrationStatus,
  PublicCareerEvent,
  PublicCareerEventsResponse,
  StudentEventsQuery,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from '../company-profile/company-access.js';
import { forbidden, notFound, unprocessable, writeAudit } from './campus-shared.js';
import { fillFreeSeats, lockEvent } from './event-seats.js';

type EventWithInstitution = Prisma.CareerEventGetPayload<{
  include: { institution: { select: { name: true } } };
}>;

type Registrant =
  | { readonly kind: 'STUDENT'; readonly userId: string; readonly institutionId: string }
  | { readonly kind: 'EMPLOYER'; readonly userId: string; readonly companyId: string };

function toRegistrationDto(row: {
  eventId: string;
  status: EventRegistrationStatus;
  registeredAt: Date;
  cancelledAt: Date | null;
}): EventRegistrationDto {
  return {
    eventId: row.eventId,
    status: row.status,
    registeredAt: row.registeredAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  };
}

/**
 * Th6-450 / 451 — students and employers discovering and registering for career events.
 * Capacity is enforced under a row lock on the event, so the last seat can only go to one person;
 * everyone after that is WAITLISTED and the oldest waitlisted person is promoted when a seat frees.
 */
@Injectable()
export class EventRegistrationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /* --------------------------------------- identity --------------------------------------- */

  private async resolveRegistrant(user: RequestUser): Promise<Registrant> {
    if (user.role === 'COMPANY') {
      const actor = await requireCompanyActor(this.prisma, user.sub, 'company.team.view');
      return { kind: 'EMPLOYER', userId: user.sub, companyId: actor.companyId };
    }
    if (user.role === 'STUDENT') {
      const student = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { institutionId: true },
      });
      if (!student?.institutionId) throw forbidden();
      return { kind: 'STUDENT', userId: user.sub, institutionId: student.institutionId };
    }
    throw forbidden();
  }

  /** Institutions where this employer holds ACTIVE access (Th6-446). */
  private async approvedInstitutionIds(companyId: string): Promise<string[]> {
    const access = await this.prisma.universityEmployerAccess.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { institutionId: true },
    });
    return access.map((entry) => entry.institutionId);
  }

  /* -------------------------------------- Th6-451 list -------------------------------------- */

  /**
   * Upcoming events for the caller: a student sees their own university's PUBLISHED events for
   * STUDENTS/BOTH, an employer sees approved universities' events open to employers. A cancelled event
   * stays listed, labelled, only for people already registered for it.
   */
  async list(user: RequestUser, query: StudentEventsQuery): Promise<PublicCareerEventsResponse> {
    const registrant = await this.resolveRegistrant(user);
    const from = query.from ? new Date(query.from) : new Date();

    const audience =
      registrant.kind === 'STUDENT'
        ? { audience: { in: ['STUDENTS', 'BOTH'] as ('STUDENTS' | 'BOTH')[] } }
        : {
            audience: { in: ['EMPLOYERS', 'BOTH'] as ('EMPLOYERS' | 'BOTH')[] },
            employerRegistration: true,
          };
    const institutionFilter =
      registrant.kind === 'STUDENT'
        ? { institutionId: registrant.institutionId }
        : { institutionId: { in: await this.approvedInstitutionIds(registrant.companyId) } };
    const mine = {
      some: {
        userId: registrant.userId,
        status: { in: ['REGISTERED', 'WAITLISTED'] as EventRegistrationStatus[] },
      },
    };

    const rows = await this.prisma.careerEvent.findMany({
      where: {
        ...institutionFilter,
        ...audience,
        startsAt: { gte: from },
        OR: [{ status: 'PUBLISHED' }, { status: 'CANCELLED', registrations: mine }],
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { institution: { select: { name: true } } },
    });
    const page = rows.slice(0, query.limit);
    const events = await this.decorate(page, registrant.userId);
    return {
      events,
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /** One event the caller may see; anything else is a 404 (drafts and other universities never leak). */
  async getVisible(user: RequestUser, eventId: string): Promise<PublicCareerEvent> {
    const registrant = await this.resolveRegistrant(user);
    const event = await this.prisma.careerEvent.findUnique({
      where: { id: eventId },
      include: { institution: { select: { name: true } } },
    });
    if (!event) throw notFound('Event not found.');
    const [entry] = await this.decorate([event], registrant.userId);
    const registered = entry?.myRegistration != null;
    const ownCampus =
      registrant.kind === 'STUDENT'
        ? event.institutionId === registrant.institutionId
        : (await this.approvedInstitutionIds(registrant.companyId)).includes(event.institutionId);
    const audienceOk =
      registrant.kind === 'STUDENT'
        ? event.audience !== 'EMPLOYERS'
        : event.audience !== 'STUDENTS' && event.employerRegistration;
    const visible =
      ownCampus &&
      audienceOk &&
      (event.status === 'PUBLISHED' || (event.status === 'CANCELLED' && registered));
    if (!visible || !entry) throw notFound('Event not found.');
    return entry;
  }

  private async decorate(
    rows: EventWithInstitution[],
    userId: string,
  ): Promise<PublicCareerEvent[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [taken, mine] = await Promise.all([
      this.prisma.eventRegistration.groupBy({
        by: ['eventId'],
        where: { eventId: { in: ids }, status: 'REGISTERED' },
        _count: { _all: true },
      }),
      this.prisma.eventRegistration.findMany({
        where: { eventId: { in: ids }, userId, status: { in: ['REGISTERED', 'WAITLISTED'] } },
        select: { eventId: true, status: true },
      }),
    ]);
    const takenBy = new Map(taken.map((group) => [group.eventId, group._count._all]));
    const mineBy = new Map(mine.map((entry) => [entry.eventId, entry.status]));
    return rows.map((row) => ({
      id: row.id,
      institutionId: row.institutionId,
      institutionName: row.institution.name,
      title: row.title,
      description: row.description,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      timezone: row.timezone,
      location: row.location,
      onlineUrl: row.onlineUrl,
      capacity: row.capacity,
      capacityLeft:
        row.capacity === null ? null : Math.max(0, row.capacity - (takenBy.get(row.id) ?? 0)),
      cancelled: row.status === 'CANCELLED',
      myRegistration: mineBy.get(row.id) ?? null,
    }));
  }

  /* ---------------------------------- Th6-450 register / cancel ---------------------------------- */

  /** Registers the caller. Registering again returns the existing registration. */
  async register(user: RequestUser, eventId: string): Promise<EventRegistrationDto> {
    const registrant = await this.resolveRegistrant(user);
    const event = await this.prisma.careerEvent.findUnique({ where: { id: eventId } });
    if (!event) throw notFound('Event not found.');
    await this.assertEligible(registrant, event);

    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId: registrant.userId } },
      });
      if (existing && existing.status !== 'CANCELLED') return toRegistrationDto(existing);

      // Re-read under the lock: the event may have been cancelled or resized since the check above.
      const fresh = await tx.careerEvent.findUniqueOrThrow({ where: { id: eventId } });
      if (fresh.status !== 'PUBLISHED') {
        throw unprocessable('event_cancelled', 'This event is no longer open for registration.');
      }
      let status: EventRegistrationStatus = 'REGISTERED';
      if (fresh.capacity !== null) {
        const taken = await tx.eventRegistration.count({
          where: { eventId, status: 'REGISTERED' },
        });
        if (taken >= fresh.capacity) status = 'WAITLISTED';
      }
      const now = new Date();
      const companyId = registrant.kind === 'EMPLOYER' ? registrant.companyId : null;
      const saved = existing
        ? await tx.eventRegistration.update({
            where: { id: existing.id },
            data: { status, registeredAt: now, cancelledAt: null, companyId },
          })
        : await tx.eventRegistration.create({
            data: { eventId, userId: registrant.userId, companyId, status, registeredAt: now },
          });
      await writeAudit(tx, {
        actorId: registrant.userId,
        action:
          status === 'REGISTERED'
            ? 'event_registration.registered'
            : 'event_registration.waitlisted',
        resourceType: 'event_registration',
        resourceId: saved.id,
        orgId: fresh.institutionId,
        before: existing ? { status: existing.status } : null,
        after: { status, eventId },
      });
      return toRegistrationDto(saved);
    });
  }

  /** Cancels the caller's own registration and promotes the oldest waitlisted person into a freed seat. */
  async cancelRegistration(user: RequestUser, eventId: string): Promise<EventRegistrationDto> {
    const registrant = await this.resolveRegistrant(user);
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, eventId);
      const event = await tx.careerEvent.findUnique({ where: { id: eventId } });
      const existing = event
        ? await tx.eventRegistration.findUnique({
            where: { eventId_userId: { eventId, userId: registrant.userId } },
          })
        : null;
      if (!event || !existing) throw notFound('Registration not found.');
      if (existing.status === 'CANCELLED') return toRegistrationDto(existing);

      const now = new Date();
      const cancelled = await tx.eventRegistration.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', cancelledAt: now },
      });
      await writeAudit(tx, {
        actorId: registrant.userId,
        action: 'event_registration.cancelled',
        resourceType: 'event_registration',
        resourceId: existing.id,
        orgId: event.institutionId,
        before: { status: existing.status },
        after: { status: 'CANCELLED', eventId },
      });
      if (existing.status === 'REGISTERED' && event.status === 'PUBLISHED') {
        await fillFreeSeats(tx, event, `cancel:${existing.id}:${now.getTime()}`);
      }
      return toRegistrationDto(cancelled);
    });
  }

  /** 404 for what the caller must not know exists; 403 with a clear reason for what they may not do. */
  private async assertEligible(
    registrant: Registrant,
    event: Prisma.CareerEventGetPayload<object>,
  ): Promise<void> {
    if (registrant.kind === 'STUDENT') {
      // Other universities' events, and drafts, are indistinguishable from events that do not exist.
      if (event.institutionId !== registrant.institutionId || event.status === 'DRAFT') {
        throw notFound('Event not found.');
      }
      if (event.audience === 'EMPLOYERS') throw forbidden('This event is for employers only.');
    } else {
      const approved = await this.approvedInstitutionIds(registrant.companyId);
      if (!approved.includes(event.institutionId)) {
        throw forbidden('Your company is not approved at this university.');
      }
      if (event.status !== 'PUBLISHED') throw forbidden('This event is not open for registration.');
      if (event.audience === 'STUDENTS') throw forbidden('This event is for students only.');
      if (!event.employerRegistration) {
        throw forbidden('This event does not accept employer registration.');
      }
    }
    if (event.status === 'CANCELLED') {
      throw unprocessable('event_cancelled', 'This event was cancelled.');
    }
    if (event.endsAt.getTime() <= Date.now()) {
      throw unprocessable('event_ended', 'This event has already ended.');
    }
  }
}
