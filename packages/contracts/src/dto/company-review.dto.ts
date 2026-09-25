import { z, IsoDateTimeSchema, UuidSchema } from './common.js';

/** Th6-355 — a company's response to a review. One per review, editable, at most 1000 characters. */
export const REVIEW_RESPONSE_MAX_LENGTH = 1000;

export const RespondToReviewRequestSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write a response before saving.')
    .max(
      REVIEW_RESPONSE_MAX_LENGTH,
      `A response can be at most ${REVIEW_RESPONSE_MAX_LENGTH} characters.`,
    ),
});
export type RespondToReviewRequest = z.infer<typeof RespondToReviewRequestSchema>;

/** Student-side submission (Th6-355). The reviewer decides whether the company may respond. */
export const CREATE_REVIEW_BODY_MAX_LENGTH = 2000;
export const CreateCompanyReviewRequestSchema = z.object({
  companyId: UuidSchema,
  rating: z
    .number()
    .int()
    .min(1, 'Choose a rating from 1 to 5.')
    .max(5, 'Choose a rating from 1 to 5.'),
  body: z
    .string()
    .trim()
    .min(10, 'Write at least 10 characters.')
    .max(CREATE_REVIEW_BODY_MAX_LENGTH),
  allowCompanyResponse: z.boolean().default(false),
});
export type CreateCompanyReviewRequest = z.infer<typeof CreateCompanyReviewRequestSchema>;

export const CompanyReviewSchema = z.object({
  id: UuidSchema,
  rating: z.number().int().min(1).max(5),
  body: z.string(),
  authorLabel: z.string(),
  createdAt: IsoDateTimeSchema,
  /** The company may only respond when this is true (set by the review's owner/moderation). */
  responsePermitted: z.boolean(),
  response: z.object({ body: z.string(), updatedAt: IsoDateTimeSchema }).nullable(),
});
export type CompanyReview = z.infer<typeof CompanyReviewSchema>;

export const ListCompanyReviewsResponseSchema = z.object({ reviews: z.array(CompanyReviewSchema) });
export type ListCompanyReviewsResponse = z.infer<typeof ListCompanyReviewsResponseSchema>;
