/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CreateCareerEventSchema,
  DecideCampusAccessRequestSchema,
  UniversityEmployerRequestsQuerySchema,
  UniversityEmployersQuerySchema,
  UpdateCareerEventSchema,
} from '@smart/contracts';
import type { CreateCareerEvent } from '@smart/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { acceptingOpeningWhere } from '../student-jobs/job-eligibility.js';
import { CampusAccessService } from './campus-access.service.js';
import { CareerEventsService } from './career-events.service.js';
import { EventRegistrationsService } from './event-registrations.service.js';

/**
 * UNI-05 against a real Postgres (partial unique index, row locks, relation filters). Opt in with
 *   CAMPUS_IT_DATABASE_URL=postgresql://…  (a database with all migrations applied)
 * Skipped otherwise, so CI without a database is unaffected.
 */
const URL = process.env.CAMPUS_IT_DATABASE_URL;

const DAY = 24 * 60 * 60 * 1000;
const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();

describe.skipIf(!URL)('UNI-05 campus access and events against Postgres', () => {
  let db: PrismaClient;
  let access: CampusAccessService;
  let events: CareerEventsService;
  let registrations: EventRegistrationsService;
  const tag = Date.now().toString(36);
  let seq = 0;
  const key = () => `uni05-${tag}-${++seq}`;
  const f: Record<string, string> = {};
  const as = (sub: string, role: string, inst: string | null = null): RequestUser => ({
    sub,
    role,
    inst,
  });
  let adminA: RequestUser;
  let staffA: RequestUser;
  let adminB: RequestUser;
  let owner: RequestUser;
  let owner2: RequestUser;
  let ownerUnverified: RequestUser;
  let studentA: RequestUser;
  let studentA2: RequestUser;
  let studentB: RequestUser;

  const eventBody = (over: Partial<CreateCareerEvent> = {}): CreateCareerEvent =>
    CreateCareerEventSchema.parse({
      title: 'Campus drive',
      startsAt: future(10),
      endsAt: future(10.1),
      timezone: 'Asia/Kolkata',
      location: 'Auditorium',
      ...over,
    });

  async function mkUser(name: string, role: string, extra: Record<string, unknown> = {}) {
    return db.user.create({
      data: {
        email: `${name}-${tag}@x.test`,
        fullName: name,
        role: role as 'STUDENT',
        ...extra,
      },
    });
  }

  async function mkCompany(name: string, verified: boolean) {
    return db.company.create({
      data: {
        name: `${name} ${tag}`,
        domain: `${name.toLowerCase()}-${tag}.test`,
        planId: f.plan!,
        verificationStatus: verified ? 'APPROVED' : 'PENDING',
      },
    });
  }

  async function mkJob(institutionId: string, companyId: string | null, title: string) {
    return db.jobOpening.create({
      data: {
        institutionId,
        companyId,
        companyName: 'Co',
        roleTitle: title,
        status: 'OPEN',
        createdById: f.adminA!,
      },
    });
  }

  const visibleJobs = (institutionId: string) =>
    db.jobOpening.findMany({ where: acceptingOpeningWhere(institutionId) });

  /** Creates and approves a request so `company` has ACTIVE access at `institution`. */
  async function grantAccess(who: RequestUser, admin: RequestUser) {
    const request = await access.requestAccess(who.sub, key(), { institutionId: admin.inst! });
    await access.decide(admin, request.id, { decision: 'APPROVE' });
    return request;
  }

  /** A published event on campus A, optionally with limited capacity. */
  async function publishedEvent(over: Partial<CreateCareerEvent> = {}) {
    const created = await events.create(adminA, key(), eventBody(over));
    return events.publish(adminA, created.id);
  }

  const notificationsFor = (userId: string, prefix: string) =>
    db.notification.count({ where: { userId, dedupeKey: { startsWith: prefix } } });

  beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL! }) });
    const svc = db as unknown as PrismaService;
    const idempotency = new IdempotencyService(svc);
    access = new CampusAccessService(svc, idempotency);
    events = new CareerEventsService(svc, idempotency);
    registrations = new EventRegistrationsService(svc);

    const plan = await db.subscriptionPlan.upsert({
      where: { code: 'FREE' },
      update: {},
      create: { code: 'FREE', name: 'Free' },
    });
    f.plan = plan.id;
    const [instA, instB] = await Promise.all(
      ['A', 'B'].map((n) =>
        db.institution.create({
          data: { name: `Uni ${n} ${tag}`, domain: `uni-${n}-${tag}.test`, planId: plan.id },
        }),
      ),
    );
    f.instA = instA!.id;
    f.instB = instB!.id;
    const [verified, verified2, unverified] = await Promise.all([
      mkCompany('Verified', true),
      mkCompany('Second', true),
      mkCompany('Unverified', false),
    ]);
    f.co = verified!.id;
    f.co2 = verified2!.id;

    const aA = await mkUser('adminA', 'INSTITUTION_ADMIN', { institutionId: f.instA });
    f.adminA = aA.id;
    adminA = as(aA.id, 'INSTITUTION_ADMIN', f.instA);
    const sA = await mkUser('staffA', 'PLACEMENT_STAFF', { institutionId: f.instA });
    staffA = as(sA.id, 'PLACEMENT_STAFF', f.instA);
    const aB = await mkUser('adminB', 'INSTITUTION_ADMIN', { institutionId: f.instB });
    adminB = as(aB.id, 'INSTITUTION_ADMIN', f.instB);
    const o = await mkUser('owner', 'COMPANY', { companyId: f.co, companyRole: 'OWNER' });
    owner = as(o.id, 'COMPANY');
    const o2 = await mkUser('owner2', 'COMPANY', { companyId: f.co2, companyRole: 'OWNER' });
    owner2 = as(o2.id, 'COMPANY');
    const ou = await mkUser('ownerU', 'COMPANY', {
      companyId: unverified!.id,
      companyRole: 'OWNER',
    });
    ownerUnverified = as(ou.id, 'COMPANY');
    const sa = await mkUser('studentA', 'STUDENT', { institutionId: f.instA });
    studentA = as(sa.id, 'STUDENT', f.instA);
    const sa2 = await mkUser('studentA2', 'STUDENT', { institutionId: f.instA });
    studentA2 = as(sa2.id, 'STUDENT', f.instA);
    const sb = await mkUser('studentB', 'STUDENT', { institutionId: f.instB });
    studentB = as(sb.id, 'STUDENT', f.instB);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  /* ------------------------------------ Th6-445 ------------------------------------ */

  describe('Th6-445 requesting and reviewing', () => {
    it('lets an unverified employer look but not ask (403)', async () => {
      const list = await access.listForEmployer(ownerUnverified.sub);
      expect(list.canRequest).toBe(false);
      await expect(
        access.requestAccess(ownerUnverified.sub, key(), { institutionId: f.instA! }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('rejects a second PENDING request for the same campus (422) and replays a retried key', async () => {
      const retryKey = key();
      const first = await access.requestAccess(owner2.sub, retryKey, {
        institutionId: f.instB!,
        message: 'Hello',
      });
      const replay = await access.requestAccess(owner2.sub, retryKey, {
        institutionId: f.instB!,
        message: 'Hello',
      });
      expect(replay.id).toBe(first.id);
      await expect(
        access.requestAccess(owner2.sub, key(), { institutionId: f.instB! }),
      ).rejects.toMatchObject({ status: 422 });
      expect(
        await db.campusAccessRequest.count({
          where: { companyId: f.co2, institutionId: f.instB, status: 'PENDING' },
        }),
      ).toBe(1);
    });

    it('scopes the review queue to the caller own university, with an empty state', async () => {
      const queueA = await access.listRequests(
        adminA,
        UniversityEmployerRequestsQuerySchema.parse({}),
      );
      expect(queueA.requests.every((r) => r.status)).toBe(true);
      const emptyState = await access.listRequests(
        { sub: adminB.sub, role: 'INSTITUTION_ADMIN', inst: f.instA! },
        UniversityEmployerRequestsQuerySchema.parse({ status: 'DENIED' }),
      );
      expect(emptyState).toEqual({ requests: [], nextCursor: null });

      const queueB = await access.listRequests(
        adminB,
        UniversityEmployerRequestsQuerySchema.parse({}),
      );
      expect(queueB.requests.map((r) => r.companyId)).toEqual([f.co2]);
      expect(queueB.requests[0]).toMatchObject({
        verified: true,
        message: 'Hello',
        status: 'PENDING',
      });
      expect(queueA.requests.map((r) => r.companyId)).not.toContain(f.co2);
    });
  });

  /* ------------------------------------ Th6-446 ------------------------------------ */

  describe('Th6-446 deciding and revoking', () => {
    it('requires a reason of 5+ characters to deny', () => {
      expect(DecideCampusAccessRequestSchema.safeParse({ decision: 'DENY' }).success).toBe(false);
      expect(
        DecideCampusAccessRequestSchema.safeParse({ decision: 'DENY', reason: 'no' }).success,
      ).toBe(false);
      expect(
        DecideCampusAccessRequestSchema.safeParse({ decision: 'DENY', reason: 'Not a fit' })
          .success,
      ).toBe(true);
    });

    it('approve shows the jobs; deciding again is idempotent; a conflicting decision is 409', async () => {
      await mkJob(f.instA!, f.co!, 'Engineer');
      await mkJob(f.instA!, null, 'Campus own job');
      expect((await visibleJobs(f.instA!)).map((j) => j.roleTitle)).toEqual(['Campus own job']);

      const request = await access.requestAccess(owner.sub, key(), { institutionId: f.instA! });
      const first = await access.decide(adminA, request.id, { decision: 'APPROVE' });
      const again = await access.decide(adminA, request.id, { decision: 'APPROVE' });
      expect(again).toEqual(first);
      expect(first.request.status).toBe('APPROVED');
      await expect(
        access.decide(adminA, request.id, { decision: 'DENY', reason: 'Changed my mind' }),
      ).rejects.toMatchObject({ status: 409 });

      expect((await visibleJobs(f.instA!)).map((j) => j.roleTitle).sort()).toEqual([
        'Campus own job',
        'Engineer',
      ]);
      expect(
        await db.universityEmployerAccess.count({
          where: { institutionId: f.instA, companyId: f.co },
        }),
      ).toBe(1);
      // One notice to the requester, even though the decision was sent twice.
      expect(await notificationsFor(owner.sub, `campus:request:${request.id}:APPROVED`)).toBe(1);
      const audits = await db.auditLog.count({
        where: { resourceId: request.id, action: 'campus_access.approved' },
      });
      expect(audits).toBe(1);
    });

    it('rejects non-admins (403) and other universities (404)', async () => {
      const request = await db.campusAccessRequest.findFirstOrThrow({
        where: { companyId: f.co2, institutionId: f.instB },
      });
      await expect(
        access.decide(staffA, request.id, { decision: 'APPROVE' }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        access.decide(adminA, request.id, { decision: 'APPROVE' }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        access.revoke(staffA, f.co!, { reason: 'Not allowed here' }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        access.revoke(adminB, f.co!, { reason: 'Not my employer' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('denying creates no access row and notifies once', async () => {
      const request = await db.campusAccessRequest.findFirstOrThrow({
        where: { companyId: f.co2, institutionId: f.instB, status: 'PENDING' },
      });
      const denied = await access.decide(adminB, request.id, {
        decision: 'DENY',
        reason: 'Not recruiting this year',
      });
      expect(denied.request).toMatchObject({
        status: 'DENIED',
        reason: 'Not recruiting this year',
      });
      expect(
        await db.universityEmployerAccess.count({
          where: { institutionId: f.instB, companyId: f.co2 },
        }),
      ).toBe(0);
      const standing = await access.listForEmployer(owner2.sub);
      expect(standing.universities.find((u) => u.institutionId === f.instB)).toMatchObject({
        status: 'DENIED',
        reason: 'Not recruiting this year',
      });
    });

    it('revoke hides the jobs but keeps applications, and repeating it is a no-op', async () => {
      const job = await db.jobOpening.findFirstOrThrow({
        where: { institutionId: f.instA, companyId: f.co },
      });
      await db.application.create({ data: { openingId: job.id, studentId: studentA.sub } });

      const revoked = await access.revoke(adminA, f.co!, { reason: 'Policy breach' });
      const repeat = await access.revoke(adminA, f.co!, { reason: 'Policy breach' });
      expect(repeat).toEqual(revoked);
      expect((await visibleJobs(f.instA!)).map((j) => j.roleTitle)).toEqual(['Campus own job']);
      expect(await db.application.count({ where: { openingId: job.id } })).toBe(1);
      expect(
        await db.notification.count({
          where: { userId: owner.sub, dedupeKey: { startsWith: 'campus:access:' } },
        }),
      ).toBe(1);
      const standing = await access.listForEmployer(owner.sub);
      expect(standing.universities.find((u) => u.institutionId === f.instA)).toMatchObject({
        status: 'REVOKED',
        reason: 'Policy breach',
      });
    });
  });

  /* ------------------------------------ Th6-447 ------------------------------------ */

  describe('Th6-447 employers recruiting here', () => {
    it('reports aggregates only, labels revoked, and is scoped to the university', async () => {
      // co is REVOKED at A (from above) with one application; re-approve then hire.
      await grantAccess(owner, adminA);
      const job = await db.jobOpening.findFirstOrThrow({
        where: { institutionId: f.instA, companyId: f.co },
      });
      await mkJob(f.instA!, f.co!, 'Second role');
      await db.application.create({ data: { openingId: job.id, studentId: studentA2.sub } });
      await db.application.updateMany({
        where: { studentId: studentA2.sub },
        data: { stage: 'HIRED' },
      });

      const list = await access.listEmployers(adminA, UniversityEmployersQuerySchema.parse({}));
      expect(list.employers).toHaveLength(1);
      expect(list.employers[0]).toMatchObject({
        companyId: f.co,
        status: 'ACTIVE',
        openJobCount: 2,
        applicantCount: 2,
        hireCount: 1,
      });
      expect(JSON.stringify(list)).not.toMatch(/studentA/);
      expect(list.employers[0]!.lastActivityAt).not.toBeNull();

      await access.revoke(adminA, f.co!, { reason: 'Contract ended' });
      const revoked = await access.listEmployers(
        adminA,
        UniversityEmployersQuerySchema.parse({ status: 'REVOKED' }),
      );
      expect(revoked.employers[0]).toMatchObject({ status: 'REVOKED' });
      const search = await access.listEmployers(
        adminA,
        UniversityEmployersQuerySchema.parse({ search: 'nomatch' }),
      );
      expect(search.employers).toEqual([]);
      const other = await access.listEmployers(adminB, UniversityEmployersQuerySchema.parse({}));
      expect(other.employers).toEqual([]);
      // Restore for the event tests below.
      await grantAccess(owner, adminA);
    });
  });

  /* --------------------------------- Th6-448 / 449 --------------------------------- */

  describe('Th6-448 create and Th6-449 lifecycle', () => {
    it('validates dates and location; staff only', async () => {
      expect(
        CreateCareerEventSchema.safeParse({
          title: 'x',
          startsAt: future(5),
          endsAt: future(4),
          timezone: 'Asia/Kolkata',
          location: 'Hall',
        }).success,
      ).toBe(false);
      const noPlace = CreateCareerEventSchema.safeParse({
        title: 'x',
        startsAt: future(5),
        endsAt: future(6),
        timezone: 'Asia/Kolkata',
      });
      expect(noPlace.success).toBe(false);
      expect(
        CreateCareerEventSchema.safeParse({
          title: 'x',
          startsAt: future(5),
          endsAt: future(6),
          timezone: 'Mars/Base',
          location: 'Hall',
        }).success,
      ).toBe(false);
      expect(
        CreateCareerEventSchema.safeParse({
          title: 'x',
          startsAt: future(5),
          endsAt: future(6),
          timezone: 'Asia/Kolkata',
          onlineUrl: 'https://meet.example.com/x',
          capacity: 0,
        }).success,
      ).toBe(false);
      await expect(
        events.create(as(f.adminA!, 'INSTITUTION_ADMIN', f.instA!), key(), {
          ...eventBody(),
          startsAt: new Date(Date.now() - DAY).toISOString(),
          endsAt: new Date(Date.now() - DAY + 3600_000).toISOString(),
        }),
      ).rejects.toMatchObject({ status: 422 });
      await expect(events.create(owner, key(), eventBody())).rejects.toMatchObject({ status: 403 });
      await expect(events.create(studentA, key(), eventBody())).rejects.toMatchObject({
        status: 403,
      });
      expect((await events.create(staffA, key(), eventBody())).status).toBe('DRAFT');
    });

    it('creates once per Idempotency-Key', async () => {
      const k = key();
      const body = eventBody({ title: 'Once' });
      const one = await events.create(adminA, k, body);
      const two = await events.create(adminA, k, body);
      await expect(events.create(adminA, k, { ...body, title: 'Different' })).rejects.toMatchObject(
        {
          status: 409,
        },
      );
      expect(two.id).toBe(one.id);
      expect(await db.careerEvent.count({ where: { title: 'Once', institutionId: f.instA } })).toBe(
        1,
      );
    });

    it('publishes twice idempotently and refuses to publish or edit a cancelled event', async () => {
      const created = await events.create(adminA, key(), eventBody());
      const first = await events.publish(adminA, created.id);
      const second = await events.publish(adminA, created.id);
      expect(second).toMatchObject({ status: 'PUBLISHED', version: first.version });
      await expect(events.publish(adminB, created.id)).rejects.toMatchObject({ status: 404 });

      await events.cancel(adminA, created.id, { reason: 'Venue unavailable' });
      const cancelled = await events.cancel(adminA, created.id, { reason: 'Venue unavailable' });
      expect(cancelled.status).toBe('CANCELLED');
      await expect(events.publish(adminA, created.id)).rejects.toMatchObject({ status: 422 });
      await expect(
        events.update(adminA, created.id, cancelled.version, { title: 'New title' }),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('notifies each registrant once per time change, and everyone once on cancel', async () => {
      const event = await publishedEvent({ location: 'Hall 1' });
      await registrations.register(studentA, event.id);
      await registrations.register(studentA2, event.id);

      const moved = await events.update(
        adminA,
        event.id,
        event.version,
        UpdateCareerEventSchema.parse({ location: 'Hall 2' }),
      );
      expect(moved.version).toBe(event.version + 1);
      for (const student of [studentA, studentA2]) {
        expect(
          await notificationsFor(student.sub, `event:${event.id}:v${moved.version}:changed`),
        ).toBe(1);
      }
      // A title-only edit changes neither time nor place, so nobody is told.
      const renamed = await events.update(
        adminA,
        event.id,
        moved.version,
        UpdateCareerEventSchema.parse({ title: 'Renamed' }),
      );
      expect(await notificationsFor(studentA.sub, `event:${event.id}:v${renamed.version}:`)).toBe(
        0,
      );

      // A stale If-Match loses.
      await expect(
        events.update(adminA, event.id, event.version, { location: 'Hall 3' }),
      ).rejects.toMatchObject({ status: 409 });

      await events.cancel(adminA, event.id, { reason: 'Speaker fell ill' });
      await events.cancel(adminA, event.id, { reason: 'Speaker fell ill' });
      for (const student of [studentA, studentA2]) {
        expect(await notificationsFor(student.sub, `event:${event.id}:cancelled`)).toBe(1);
      }
      const detail = await events.get(adminA, event.id);
      expect(detail.registrants).toHaveLength(2);
      expect(detail.event.status).toBe('CANCELLED');
      await expect(events.get(adminB, event.id)).rejects.toMatchObject({ status: 404 });
    });
  });

  /* --------------------------------- Th6-450 / 451 --------------------------------- */

  describe('Th6-450 registering', () => {
    it('gives the last seat to one of two concurrent registrants and waitlists the other', async () => {
      const event = await publishedEvent({ capacity: 1 });
      const results = await Promise.all([
        registrations.register(studentA, event.id),
        registrations.register(studentA2, event.id),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual(['REGISTERED', 'WAITLISTED']);
      expect(
        await db.eventRegistration.count({ where: { eventId: event.id, status: 'REGISTERED' } }),
      ).toBe(1);
    });

    it('registering twice returns the same registration', async () => {
      const event = await publishedEvent();
      const one = await registrations.register(studentA, event.id);
      const two = await registrations.register(studentA, event.id);
      expect(two).toEqual(one);
      expect(await db.eventRegistration.count({ where: { eventId: event.id } })).toBe(1);
    });

    it('promotes the oldest waitlisted person when a seat frees, and notifies them once', async () => {
      const event = await publishedEvent({ capacity: 1 });
      await registrations.register(studentA, event.id);
      const waiting = await registrations.register(studentA2, event.id);
      expect(waiting.status).toBe('WAITLISTED');

      await registrations.cancelRegistration(studentA, event.id);
      await registrations.cancelRegistration(studentA, event.id);
      const promoted = await db.eventRegistration.findUniqueOrThrow({
        where: { eventId_userId: { eventId: event.id, userId: studentA2.sub } },
      });
      expect(promoted.status).toBe('REGISTERED');
      expect(await notificationsFor(studentA2.sub, `event:${event.id}:promoted:`)).toBe(1);
    });

    it('turns away unapproved employers, wrong audiences and other universities with a clear reason', async () => {
      const employersOnly = await publishedEvent({
        audience: 'EMPLOYERS',
        employerRegistration: true,
      });
      await expect(registrations.register(owner2, employersOnly.id)).rejects.toMatchObject({
        status: 403,
        response: { message: 'Your company is not approved at this university.' },
      });
      await expect(registrations.register(studentA, employersOnly.id)).rejects.toMatchObject({
        status: 403,
      });
      await expect(registrations.register(studentB, employersOnly.id)).rejects.toMatchObject({
        status: 404,
      });

      const noEmployers = await publishedEvent({ audience: 'BOTH', employerRegistration: false });
      await expect(registrations.register(owner, noEmployers.id)).rejects.toMatchObject({
        status: 403,
      });

      // The approved employer (access granted above) may register for an employer event.
      const seat = await registrations.register(owner, employersOnly.id);
      expect(seat.status).toBe('REGISTERED');
      const draft = await events.create(
        adminA,
        key(),
        eventBody({ audience: 'BOTH', employerRegistration: true }),
      );
      await expect(registrations.register(owner, draft.id)).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('Th6-451 discovery', () => {
    it('lists only own-university published student events, soonest first, with capacity left', async () => {
      const sooner = await publishedEvent({
        title: 'Sooner',
        startsAt: future(2),
        endsAt: future(2.1),
      });
      const later = await publishedEvent({
        title: 'Later',
        startsAt: future(30),
        endsAt: future(30.1),
        capacity: 5,
      });
      const draft = await events.create(adminA, key(), eventBody({ title: 'Draft only' }));
      const employersOnly = await publishedEvent({
        title: 'Employers only',
        audience: 'EMPLOYERS',
      });
      const otherCampus = await events.create(adminB, key(), eventBody({ title: 'Other campus' }));
      await events.publish(adminB, otherCampus.id);
      await registrations.register(studentA, later.id);

      const list = await registrations.list(studentA, { limit: 50 } as never);
      const titles = list.events.map((e) => e.title);
      expect(titles).not.toContain('Draft only');
      expect(titles).not.toContain('Employers only');
      expect(titles).not.toContain('Other campus');
      expect(titles.indexOf('Sooner')).toBeLessThan(titles.indexOf('Later'));
      expect(list.events.find((e) => e.id === later.id)).toMatchObject({
        capacityLeft: 4,
        myRegistration: 'REGISTERED',
        timezone: 'Asia/Kolkata',
      });
      expect(list.events.find((e) => e.id === sooner.id)).toMatchObject({ capacityLeft: null });

      await expect(registrations.getVisible(studentA, draft.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(registrations.getVisible(studentA, employersOnly.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(registrations.getVisible(studentB, later.id)).rejects.toMatchObject({
        status: 404,
      });

      const otherView = await registrations.list(studentB, { limit: 50 } as never);
      expect(otherView.events.map((e) => e.title)).toEqual(['Other campus']);
    });

    it('keeps a cancelled event, labelled, only for people registered for it', async () => {
      const event = await publishedEvent({ title: 'Will be cancelled' });
      await registrations.register(studentA, event.id);
      await events.cancel(adminA, event.id, { reason: 'Not enough interest' });

      const mine = await registrations.list(studentA, { limit: 50 } as never);
      expect(mine.events.find((e) => e.id === event.id)).toMatchObject({ cancelled: true });
      const others = await registrations.list(studentA2, { limit: 50 } as never);
      expect(others.events.map((e) => e.id)).not.toContain(event.id);
      await expect(registrations.getVisible(studentA2, event.id)).rejects.toMatchObject({
        status: 404,
      });
      await expect(registrations.register(studentA2, event.id)).rejects.toMatchObject({
        status: 422,
      });
    });

    it('shows the empty state for a university with no events', async () => {
      const lonely = await mkUser('lonely', 'STUDENT', {
        institutionId: (
          await db.institution.create({
            data: { name: `Empty ${tag}`, domain: `empty-${tag}.test`, planId: f.plan! },
          })
        ).id,
      });
      const list = await registrations.list(as(lonely.id, 'STUDENT'), { limit: 25 } as never);
      expect(list).toEqual({ events: [], nextCursor: null });
    });
  });
});
