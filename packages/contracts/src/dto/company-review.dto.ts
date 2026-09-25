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
