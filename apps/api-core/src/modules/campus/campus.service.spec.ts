import { describe, expect, it, vi } from 'vitest';
import {
  CreateCareerEventSchema,
  DecideCampusAccessRequestSchema,
  UpdateCareerEventSchema,
} from '@smart/contracts';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { withIdempotencyLedger } from '../company-profile/test-utils.js';
import { parseEventVersion } from './university-events.controller.js';
import { CampusAccessService } from './campus-access.service.js';
import { CareerEventsService } from './career-events.service.js';
import { EventRegistrationsService } from './event-registrations.service.js';

/**
 * Guard-path behaviour that needs no database: roles, tenant scoping and validation. The state-changing
 * flows (approve/revoke visibility, notifications, waitlist, concurrency) run against Postgres in
 * campus.integration.spec.ts.
 */

const INST_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INST_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const EVENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const user = (role: string, inst: string | null, sub = 'u1'): RequestUser => ({ sub, role, inst });
const admin = user('INSTITUTION_ADMIN', INST_A);
const staff = user('PLACEMENT_STAFF', INST_A);

const soon = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const eventBody = () =>
  CreateCareerEventSchema.parse({
    title: 'Drive',
    startsAt: soon(5),
    endsAt: soon(6),
    timezone: 'Asia/Kolkata',
    location: 'Hall',
  });

function build(base: Record<string, unknown>) {
  const { prisma, idempotency } = withIdempotencyLedger(base);
  return {
    prisma,
    access: new CampusAccessService(prisma, idempotency),
    events: new CareerEventsService(prisma, idempotency),
    registrations: new EventRegistrationsService(prisma),
  };
}

describe('Th6-445 request campus access', () => {
  const employer = (verificationStatus: string) => ({
    user: {
      findUnique: vi.fn().mockResolvedValue({
        role: 'COMPANY',
        companyId: CO,
        companyRole: 'OWNER',
        deactivatedAt: null,
      }),
    },
    company: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ verificationStatus, deactivatedAt: null, heldAt: null }),
    },
    institution: { findFirst: vi.fn().mockResolvedValue({ id: INST_A }) },
  });

  it('refuses an unverified employer with 403 before touching anything', async () => {
    const { access, prisma } = build({
      ...employer('PENDING'),
      campusAccessRequest: { create: vi.fn() },
    });
    await expect(access.requestAccess('u1', 'k1', { institutionId: INST_A })).rejects.toMatchObject(
      {
        status: 403,
      },
    );
    expect(prisma.campusAccessRequest.create).not.toHaveBeenCalled();
  });

  it('rejects a second pending request with 422', async () => {
    const { access } = build({
      ...employer('APPROVED'),
      campusAccessRequest: {
        findFirst: vi.fn().mockResolvedValue({ id: 'existing' }),
        create: vi.fn(),
      },
      universityEmployerAccess: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    await expect(access.requestAccess('u1', 'k1', { institutionId: INST_A })).rejects.toMatchObject(
      {
        status: 422,
        response: { error: 'duplicate_pending' },
      },
    );
  });

  it('turns a database unique-index race into the same 422', async () => {
    const { access } = build({
      ...employer('APPROVED'),
      campusAccessRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' })),
      },
      universityEmployerAccess: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    await expect(access.requestAccess('u1', 'k1', { institutionId: INST_A })).rejects.toMatchObject(
      {
        status: 422,
      },
    );
  });

  it('a request to an unknown university is a 404', async () => {
    const base = employer('APPROVED');
    base.institution.findFirst.mockResolvedValue(null);
    const { access } = build(base);
    await expect(access.requestAccess('u1', 'k1', { institutionId: INST_B })).rejects.toMatchObject(
      {
        status: 404,
      },
    );
  });
});

describe('Th6-446 deciding', () => {
  it('requires a denial reason of 5+ characters', () => {
    expect(DecideCampusAccessRequestSchema.safeParse({ decision: 'DENY' }).success).toBe(false);
    expect(
      DecideCampusAccessRequestSchema.safeParse({ decision: 'DENY', reason: 'no' }).success,
    ).toBe(false);
    expect(
      DecideCampusAccessRequestSchema.safeParse({ decision: 'DENY', reason: 'Not a fit' }).success,
    ).toBe(true);
    expect(DecideCampusAccessRequestSchema.safeParse({ decision: 'APPROVE' }).success).toBe(true);
  });

  it('is INSTITUTION_ADMIN only (403 for placement staff, students and employers)', async () => {
    const { access } = build({});
    for (const caller of [staff, user('STUDENT', INST_A), user('COMPANY', null)]) {
      await expect(access.decide(caller, EVENT, { decision: 'APPROVE' })).rejects.toMatchObject({
        status: 403,
      });
      await expect(access.revoke(caller, CO, { reason: 'Because' })).rejects.toMatchObject({
        status: 403,
      });
    }
  });

  it('treats another university request as 404', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const { access } = build({ campusAccessRequest: { findFirst } });
    await expect(access.decide(admin, EVENT, { decision: 'APPROVE' })).rejects.toMatchObject({
      status: 404,
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: EVENT, institutionId: INST_A } }),
    );
  });

  it('a conflicting decision on a decided request is 409', async () => {
    const decided = { id: EVENT, status: 'APPROVED', companyId: CO, requestedById: 'u9' };
    const { access } = build({
      campusAccessRequest: { findFirst: vi.fn().mockResolvedValue(decided) },
    });
    await expect(
      access.decide(admin, EVENT, { decision: 'DENY', reason: 'Changed my mind' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('scopes the review queue and the employers list to the caller institution', async () => {
    const requests = vi.fn().mockResolvedValue([]);
    const access = vi.fn().mockResolvedValue([]);
    const { access: service } = build({
      campusAccessRequest: { findMany: requests },
      universityEmployerAccess: { findMany: access },
    });
    await service.listRequests(staff, { limit: 25 } as any);
    await service.listEmployers(admin, { limit: 25 } as any);
    expect(requests.mock.calls[0]?.[0].where).toMatchObject({ institutionId: INST_A });
    expect(access.mock.calls[0]?.[0].where).toMatchObject({ institutionId: INST_A });
    await expect(
      service.listRequests(user('STUDENT', INST_A), { limit: 25 } as any),
    ).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('Th6-448 / 449 event rules', () => {
  it('only university staff may create, and the start must be in the future', async () => {
    const { events } = build({});
    for (const caller of [
      user('COMPANY', null),
      user('STUDENT', INST_A),
      user('PLACEMENT_STAFF', null),
    ]) {
      await expect(events.create(caller, 'k', eventBody())).rejects.toMatchObject({ status: 403 });
    }
    await expect(
      events.create(admin, 'k', {
        ...eventBody(),
        startsAt: soon(-2),
        endsAt: soon(-1),
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('validates end after start, location or link, capacity and the IANA timezone', () => {
    const base = {
      title: 'x',
      startsAt: soon(5),
      endsAt: soon(6),
      timezone: 'Asia/Kolkata',
      location: 'Hall',
    };
    expect(CreateCareerEventSchema.safeParse(base).success).toBe(true);
    expect(CreateCareerEventSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(
      false,
    );
    expect(CreateCareerEventSchema.safeParse({ ...base, location: undefined }).success).toBe(false);
    expect(
      CreateCareerEventSchema.safeParse({
        ...base,
        location: undefined,
        onlineUrl: 'https://x.test/m',
      }).success,
    ).toBe(true);
    expect(CreateCareerEventSchema.safeParse({ ...base, capacity: 0 }).success).toBe(false);
    expect(CreateCareerEventSchema.safeParse({ ...base, timezone: 'Mars/Base' }).success).toBe(
      false,
    );
    expect(CreateCareerEventSchema.safeParse({ ...base, title: ' ' }).success).toBe(false);
    expect(UpdateCareerEventSchema.safeParse({ startsAt: soon(6), endsAt: soon(5) }).success).toBe(
      false,
    );
  });

  it('parses If-Match as a version and rejects a missing or malformed one', () => {
    expect(parseEventVersion('3')).toBe(3);
    expect(parseEventVersion('W/"4"')).toBe(4);
    expect(() => parseEventVersion(undefined)).toThrowError();
    expect(() => parseEventVersion('abc')).toThrowError();
  });

  const eventRow = (over: Record<string, unknown> = {}) => ({
    id: EVENT,
    institutionId: INST_A,
    title: 'Drive',
    description: '',
    startsAt: new Date(soon(5)),
    endsAt: new Date(soon(6)),
    timezone: 'Asia/Kolkata',
    location: 'Hall',
    onlineUrl: null,
    capacity: null,
    audience: 'STUDENTS',
    employerRegistration: false,
    status: 'PUBLISHED',
    cancelReason: null,
    version: 3,
    updatedAt: new Date(),
    ...over,
  });
  const eventDb = (row: Record<string, unknown> | null) => ({
    $queryRaw: vi.fn().mockResolvedValue([]),
    careerEvent: { findFirst: vi.fn().mockResolvedValue(row), updateMany: vi.fn() },
    eventRegistration: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  });

  it('a stale If-Match is 409', async () => {
    const { events } = build(eventDb(eventRow({ version: 3 })));
    await expect(events.update(admin, EVENT, 2, { title: 'New' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('editing or publishing a cancelled event is 422', async () => {
    const { events } = build(eventDb(eventRow({ status: 'CANCELLED' })));
    await expect(events.update(admin, EVENT, 3, { title: 'New' })).rejects.toMatchObject({
      status: 422,
    });
    await expect(events.publish(admin, EVENT)).rejects.toMatchObject({ status: 422 });
  });

  it('another university event is a 404', async () => {
    const { events } = build(eventDb(null));
    await expect(
      events.update(user('INSTITUTION_ADMIN', INST_B), EVENT, 3, {}),
    ).rejects.toMatchObject({
      status: 404,
    });
    await expect(events.get(user('INSTITUTION_ADMIN', INST_B), EVENT)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('Th6-450 / 451 registration eligibility', () => {
  const employerUser = user('COMPANY', null, 'emp1');
  const studentUser = user('STUDENT', INST_A, 'stu1');
  const event = (over: Record<string, unknown> = {}) => ({
    id: EVENT,
    institutionId: INST_A,
    status: 'PUBLISHED',
    audience: 'BOTH',
    employerRegistration: true,
    endsAt: new Date(soon(6)),
    ...over,
  });
  const regDb = (row: Record<string, unknown> | null, approvedInstitutions: string[]) => ({
    user: {
      findUnique: vi.fn().mockResolvedValue({
        role: 'COMPANY',
        companyId: CO,
        companyRole: 'OWNER',
        deactivatedAt: null,
        institutionId: INST_A,
      }),
    },
    careerEvent: { findUnique: vi.fn().mockResolvedValue(row) },
    universityEmployerAccess: {
      findMany: vi
        .fn()
        .mockResolvedValue(approvedInstitutions.map((institutionId) => ({ institutionId }))),
    },
  });

  it('an employer without ACTIVE access is 403 with the reason', async () => {
    const { registrations } = build(regDb(event(), []));
    await expect(registrations.register(employerUser, EVENT)).rejects.toMatchObject({
      status: 403,
      response: { message: 'Your company is not approved at this university.' },
    });
  });

  it('an approved employer is refused for student-only, no-employer-registration and unpublished events', async () => {
    for (const row of [
      event({ audience: 'STUDENTS' }),
      event({ employerRegistration: false }),
      event({ status: 'DRAFT' }),
      event({ status: 'CANCELLED' }),
    ]) {
      const { registrations } = build(regDb(row, [INST_A]));
      await expect(registrations.register(employerUser, EVENT)).rejects.toMatchObject({
        status: 403,
      });
    }
  });

  it('a student never learns about other universities events or drafts (404), nor employer-only events (403)', async () => {
    const studentDb = (row: Record<string, unknown>) => ({
      ...regDb(row, []),
      user: { findUnique: vi.fn().mockResolvedValue({ institutionId: INST_A }) },
    });
    for (const row of [event({ institutionId: INST_B }), event({ status: 'DRAFT' })]) {
      const { registrations } = build(studentDb(row));
      await expect(registrations.register(studentUser, EVENT)).rejects.toMatchObject({
        status: 404,
      });
    }
    const { registrations } = build(studentDb(event({ audience: 'EMPLOYERS' })));
    await expect(registrations.register(studentUser, EVENT)).rejects.toMatchObject({ status: 403 });
  });

  it('other roles cannot register at all', async () => {
    const { registrations } = build({});
    await expect(
      registrations.register(user('PLACEMENT_STAFF', INST_A), EVENT),
    ).rejects.toMatchObject({
      status: 403,
    });
  });
});
