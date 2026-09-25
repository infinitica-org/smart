import { ForbiddenException } from '@nestjs/common';
import { REVIEW_RESPONSE_MAX_LENGTH, RespondToReviewRequestSchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyReviewsService } from './company-reviews.service.js';
import { IDS, withIdempotencyLedger } from './test-utils.js';

const REVIEW = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

type Review = {
  id: string;
  companyId: string;
  status: 'PUBLISHED' | 'HIDDEN';
  responsePermitted: boolean;
  rating: number;
  body: string;
  authorLabel: string;
  createdAt: Date;
  response: { body: string; updatedAt: Date } | null;
};

describe('CompanyReviewsService (Th6-355)', () => {
  let reviews: Review[];
  let actor: {
    role: string;
    companyId: string | null;
    companyRole: string | null;
    deactivatedAt: Date | null;
  };
  let prisma: any;
  let service: CompanyReviewsService;

  beforeEach(() => {
    actor = { role: 'COMPANY', companyId: IDS.companyA, companyRole: 'OWNER', deactivatedAt: null };
    reviews = [
      {
        id: REVIEW,
        companyId: IDS.companyA,
        status: 'PUBLISHED',
        responsePermitted: true,
        rating: 4,
        body: 'Great interview process.',
        authorLabel: 'Verified intern',
        createdAt: new Date('2026-09-10T00:00:00Z'),
        response: null,
      },
    ];
    const ledger = withIdempotencyLedger({
      user: { findUnique: vi.fn(async () => actor) },
      companyReview: {
        findMany: vi.fn(async ({ where }: any) =>
          reviews.filter((r) => r.companyId === where.companyId && r.status === where.status),
        ),
        findFirst: vi.fn(async ({ where }: any) => {
          const found = reviews.find(
            (r) =>
              r.id === where.id && r.companyId === where.companyId && r.status === where.status,
          );
          return found ? { ...found } : null;
        }),
        findUniqueOrThrow: vi.fn(async ({ where }: any) => ({
          ...reviews.find((r) => r.id === where.id),
        })),
      },
      reviewResponse: {
        upsert: vi.fn(async ({ where, update, create }: any) => {
          const review = reviews.find((r) => r.id === where.reviewId) as Review;
          review.response = {
            body: (review.response ? update : create).body,
            updatedAt: new Date(),
          };
        }),
      },
    });
    prisma = ledger.prisma;
    service = new CompanyReviewsService(prisma, ledger.idempotency);
  });

  it('lists only my published reviews (empty state when none)', async () => {
    reviews.push({ ...(reviews[0] as Review), id: 'x', companyId: IDS.companyB });
    expect((await service.list(IDS.owner)).reviews.map((r) => r.id)).toEqual([REVIEW]);
    reviews.length = 0;
    expect(await service.list(IDS.owner)).toEqual({ reviews: [] });
  });

  it('creates a response and audits before/after', async () => {
    const result = await service.respond(IDS.owner, {
      key: 'k1',
      reviewId: REVIEW,
      body: { body: 'Thank you!' },
    });
    expect(result.response?.body).toBe('Thank you!');
    const audit = prisma.auditLog.create.mock.calls[0]?.[0].data;
    expect(audit).toMatchObject({ action: 'company.review_responded', resourceId: REVIEW });
    expect(audit.metadata).toMatchObject({
      before: { response: null },
      after: { response: 'Thank you!' },
    });
  });

  it('edits the single response instead of adding a second', async () => {
    await service.respond(IDS.owner, { key: 'k1', reviewId: REVIEW, body: { body: 'First' } });
    const edited = await service.respond(IDS.owner, {
      key: 'k2',
      reviewId: REVIEW,
      body: { body: 'Edited' },
    });
    expect(edited.response?.body).toBe('Edited');
    expect(prisma.auditLog.create.mock.calls[1]?.[0].data).toMatchObject({
      action: 'company.review_response_edited',
    });
    expect(prisma.auditLog.create.mock.calls[1]?.[0].data.metadata.before).toEqual({
      response: 'First',
    });
  });

  it('refuses a review that does not permit a response (409)', async () => {
    (reviews[0] as Review).responsePermitted = false;
    await expect(
      service.respond(IDS.owner, { key: 'k1', reviewId: REVIEW, body: { body: 'Hi' } }),
    ).rejects.toMatchObject({ status: 409 });
    expect(prisma.reviewResponse.upsert).not.toHaveBeenCalled();
  });

  it("returns 404 for another company's or a hidden review", async () => {
    actor.companyId = IDS.companyB;
    await expect(
      service.respond(IDS.otherCompanyUser, { key: 'k1', reviewId: REVIEW, body: { body: 'Hi' } }),
    ).rejects.toMatchObject({ status: 404 });
    actor.companyId = IDS.companyA;
    (reviews[0] as Review).status = 'HIDDEN';
    await expect(
      service.respond(IDS.owner, { key: 'k2', reviewId: REVIEW, body: { body: 'Hi' } }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lets a permitted recruiter respond, and never 403s the owner', async () => {
    actor.companyRole = 'RECRUITER';
    await expect(
      service.respond(IDS.recruiter, { key: 'k1', reviewId: REVIEW, body: { body: 'Hi' } }),
    ).resolves.toBeDefined();
    actor.companyRole = 'OWNER';
    await expect(service.list(IDS.owner)).resolves.toBeDefined();
  });

  it('rejects non-company and deactivated users with 403', async () => {
    actor.role = 'STUDENT';
    await expect(service.list(IDS.owner)).rejects.toBeInstanceOf(ForbiddenException);
    actor.role = 'COMPANY';
    actor.deactivatedAt = new Date();
    await expect(service.list(IDS.owner)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a retry with the same Idempotency-Key writes and audits once', async () => {
    const args = { key: 'same', reviewId: REVIEW, body: { body: 'Once' } };
    const first = await service.respond(IDS.owner, args);
    const retry = await service.respond(IDS.owner, args);
    expect(retry).toEqual(first);
    expect(prisma.reviewResponse.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('validates the response length server-side (422 schema)', () => {
    expect(
      RespondToReviewRequestSchema.safeParse({ body: 'a'.repeat(REVIEW_RESPONSE_MAX_LENGTH) })
        .success,
    ).toBe(true);
    expect(
      RespondToReviewRequestSchema.safeParse({ body: 'a'.repeat(REVIEW_RESPONSE_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
    expect(RespondToReviewRequestSchema.safeParse({ body: '   ' }).success).toBe(false);
  });
});
