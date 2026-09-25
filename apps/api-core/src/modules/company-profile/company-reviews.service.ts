import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CompanyReview,
  ListCompanyReviewsResponse,
  RespondToReviewRequest,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from './company-access.js';
import { IdempotencyService } from './idempotency.service.js';

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  authorLabel: string;
  createdAt: Date;
  responsePermitted: boolean;
  response: { body: string; updatedAt: Date } | null;
};

export function toCompanyReview(row: ReviewRow): CompanyReview {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    authorLabel: row.authorLabel,
    createdAt: row.createdAt.toISOString(),
    responsePermitted: row.responsePermitted,
    response: row.response
      ? { body: row.response.body, updatedAt: row.response.updatedAt.toISOString() }
      : null,
  };
}

const REVIEW_INCLUDE = { response: { select: { body: true, updatedAt: true } } } as const;

/** Th6-355 — company responses to reviews. A review of another company is a 404, never a 403. */
@Injectable()
export class CompanyReviewsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  async list(userId: string): Promise<ListCompanyReviewsResponse> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.reviews.respond');
    const rows = await this.prisma.companyReview.findMany({
      where: { companyId: actor.companyId, status: 'PUBLISHED' },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return { reviews: rows.map(toCompanyReview) };
  }

  /** Creates the response, or edits it: there is exactly one per review. */
  async respond(
    userId: string,
    params: { key: string; reviewId: string; body: RespondToReviewRequest },
  ): Promise<CompanyReview> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.reviews.respond');
    return this.idempotency.run({
      userId,
      scope: `employer.reviews.respond:${params.reviewId}`,
      key: params.key,
      request: params.body,
      execute: async (tx) => {
        const review = await tx.companyReview.findFirst({
          where: { id: params.reviewId, companyId: actor.companyId, status: 'PUBLISHED' },
          include: REVIEW_INCLUDE,
        });
        if (!review) {
          throw new NotFoundException({
            error: 'not_found',
            message: 'Review not found.',
            statusCode: 404,
          });
        }
        if (!review.responsePermitted) {
          throw new ConflictException({
            error: 'response_not_permitted',
            message: 'This review does not allow a company response.',
            statusCode: 409,
          });
        }

        await tx.reviewResponse.upsert({
          where: { reviewId: review.id },
          create: {
            reviewId: review.id,
            companyId: actor.companyId,
            authorId: userId,
            body: params.body.body,
          },
          update: { body: params.body.body, authorId: userId },
        });
        const after = await tx.companyReview.findUniqueOrThrow({
          where: { id: review.id },
          include: REVIEW_INCLUDE,
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: review.response ? 'company.review_response_edited' : 'company.review_responded',
            resourceType: 'company_review',
            resourceId: review.id,
            metadata: {
              companyId: actor.companyId,
              before: { response: review.response?.body ?? null },
              after: { response: params.body.body },
            } as Prisma.InputJsonValue,
          },
        });
        return { result: toCompanyReview(after) };
      },
    });
  }
}
