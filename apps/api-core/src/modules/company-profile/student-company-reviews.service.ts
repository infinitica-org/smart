import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CompanyReview, CreateCompanyReviewRequest } from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { toCompanyReview } from './company-reviews.service.js';

/**
 * Th6-355 (student side) — a student reviews a verified company they applied to. The reviewer chooses
 * whether the company may respond (`responsePermitted`); one review per student per company.
 */
@Injectable()
export class StudentCompanyReviewsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  async create(
    studentId: string,
    params: { key: string; body: CreateCompanyReviewRequest },
  ): Promise<CompanyReview> {
    return this.idempotency.run({
      userId: studentId,
      scope: 'me.company-reviews.create',
      key: params.key,
      request: params.body,
      execute: async (tx) => {
        const company = await tx.company.findUnique({
          where: { id: params.body.companyId },
          select: { id: true, verificationStatus: true, deactivatedAt: true, heldAt: true },
        });
        // Unverified or unknown companies have no public presence, so they cannot be reviewed.
        if (
          !company ||
          company.verificationStatus !== 'APPROVED' ||
          company.deactivatedAt ||
          company.heldAt
        ) {
          throw new NotFoundException({
            error: 'not_found',
            message: 'Company not found.',
            statusCode: 404,
          });
        }
        const applied = await tx.application.count({
          where: { studentId, opening: { companyId: company.id } },
        });
        if (applied === 0) {
          throw new ForbiddenException({
            error: 'forbidden',
            message: 'You can only review companies you have applied to.',
            statusCode: 403,
          });
        }
        const existing = await tx.companyReview.count({
          where: { companyId: company.id, authorId: studentId },
        });
        if (existing > 0) {
          throw new ConflictException({
            error: 'review_exists',
            message: 'You have already reviewed this company.',
            statusCode: 409,
          });
        }

        const created = await tx.companyReview.create({
          data: {
            companyId: company.id,
            authorId: studentId,
            authorLabel: 'Applicant',
            rating: params.body.rating,
            body: params.body.body,
            responsePermitted: params.body.allowCompanyResponse,
          },
          include: { response: { select: { body: true, updatedAt: true } } },
        });
        await tx.auditLog.create({
          data: {
            actorId: studentId,
            action: 'company.review_created',
            resourceType: 'company_review',
            resourceId: created.id,
            metadata: {
              companyId: company.id,
              rating: params.body.rating,
              responsePermitted: params.body.allowCompanyResponse,
            } as Prisma.InputJsonValue,
          },
        });
        return { result: toCompanyReview(created) };
      },
    });
  }
}
