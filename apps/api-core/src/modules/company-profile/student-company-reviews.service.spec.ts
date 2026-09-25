import { CreateCompanyReviewRequestSchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentCompanyReviewsService } from './student-company-reviews.service.js';
import { IDS, withIdempotencyLedger } from './test-utils.js';

const STUDENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const body = (over: Record<string, unknown> = {}) =>
  CreateCompanyReviewRequestSchema.parse({
    companyId: IDS.companyA,
    rating: 5,
    body: 'Smooth and respectful hiring process.',
    allowCompanyResponse: true,
    ...over,
  });

describe('StudentCompanyReviewsService (Th6-355)', () => {
  let prisma: any;
  let service: StudentCompanyReviewsService;
  let company: Record<string, unknown> | null;
  let applied: number;
  let existing: number;

  beforeEach(() => {
    company = {
      id: IDS.companyA,
      verificationStatus: 'APPROVED',
      deactivatedAt: null,
      heldAt: null,
    };
    applied = 1;
    existing = 0;
    const ledger = withIdempotencyLedger({
      company: { findUnique: vi.fn(async () => company) },
      application: { count: vi.fn(async () => applied) },
      companyReview: {
        count: vi.fn(async () => existing),
        create: vi.fn(async ({ data }: any) => ({
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          createdAt: new Date('2026-09-25T00:00:00Z'),
          response: null,
          ...data,
        })),
      },
    });
    prisma = ledger.prisma;
    service = new StudentCompanyReviewsService(prisma, ledger.idempotency);
  });

  it('creates a review, lets the student decide on responses, and audits', async () => {
    const review = await service.create(STUDENT, { key: 'k1', body: body() });
    expect(review).toMatchObject({ rating: 5, responsePermitted: true, authorLabel: 'Applicant' });
    // The reviewer's identity never leaves the service.
    expect(JSON.stringify(review)).not.toContain(STUDENT);
    expect(prisma.companyReview.create.mock.calls[0]?.[0].data.authorId).toBe(STUDENT);
    expect(prisma.auditLog.create.mock.calls[0]?.[0].data.action).toBe('company.review_created');
  });

  it('defaults to not allowing a company response', async () => {
    const review = await service.create(STUDENT, {
      key: 'k2',
      body: body({ allowCompanyResponse: undefined }),
    });
    expect(review.responsePermitted).toBe(false);
  });

  it.each([
    ['unknown', null],
    [
      'pending',
      { id: IDS.companyA, verificationStatus: 'PENDING', deactivatedAt: null, heldAt: null },
    ],
    [
      'held',
      { id: IDS.companyA, verificationStatus: 'APPROVED', deactivatedAt: null, heldAt: new Date() },
    ],
  ])('404s for an %s company', async (_label, value) => {
    company = value as never;
    await expect(service.create(STUDENT, { key: 'k3', body: body() })).rejects.toMatchObject({
      status: 404,
    });
    expect(prisma.companyReview.create).not.toHaveBeenCalled();
  });

  it('403s a student who never applied to the company', async () => {
    applied = 0;
    await expect(service.create(STUDENT, { key: 'k4', body: body() })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('409s a second review of the same company', async () => {
    existing = 1;
    await expect(service.create(STUDENT, { key: 'k5', body: body() })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('a retry with the same Idempotency-Key creates one review', async () => {
    const first = await service.create(STUDENT, { key: 'same', body: body() });
    const retry = await service.create(STUDENT, { key: 'same', body: body() });
    expect(retry).toEqual(first);
    expect(prisma.companyReview.create).toHaveBeenCalledTimes(1);
  });

  it('validates rating and text server-side (422 schema)', () => {
    const bad = (over: Record<string, unknown>) =>
      CreateCompanyReviewRequestSchema.safeParse({
        companyId: IDS.companyA,
        rating: 4,
        body: 'A long enough review body.',
        ...over,
      }).success;
    expect(bad({})).toBe(true);
    expect(bad({ rating: 0 })).toBe(false);
    expect(bad({ rating: 6 })).toBe(false);
    expect(bad({ body: 'short' })).toBe(false);
    expect(bad({ companyId: 'nope' })).toBe(false);
  });
});
