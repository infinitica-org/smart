import { z, IsoDateTimeSchema, UuidSchema } from './common.js';

/** APP-02 — internal notes, recruiter assignment, offer/joining outcomes and conversion metrics (Th6-416/417/420/421). */

/* ------------------------------ internal notes (Th6-416) ------------------------------ */

export const CANDIDATE_NOTE_MAX_LENGTH = 2000;

export const AddCandidateNoteRequestSchema = z.object({
  body: z.string().trim().min(1, 'Write a note first.').max(CANDIDATE_NOTE_MAX_LENGTH),
});
export type AddCandidateNoteRequest = z.infer<typeof AddCandidateNoteRequestSchema>;

/** Internal to the company: no student endpoint ever returns this. */
export const CandidateNoteSchema = z.object({
  id: UuidSchema,
  applicationId: UuidSchema,
  body: z.string(),
  authorId: UuidSchema,
  authorName: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type CandidateNote = z.infer<typeof CandidateNoteSchema>;

export const ListCandidateNotesResponseSchema = z.object({ notes: z.array(CandidateNoteSchema) });
export type ListCandidateNotesResponse = z.infer<typeof ListCandidateNotesResponseSchema>;

/* --------------------------- recruiter assignment (Th6-417) --------------------------- */

export const AssignRecruiterRequestSchema = z.object({
  /** A team member of the company, or null to unassign. */
  assigneeId: UuidSchema.nullable(),
});
export type AssignRecruiterRequest = z.infer<typeof AssignRecruiterRequestSchema>;

export const AssignRecruiterResponseSchema = z.object({
  applicationId: UuidSchema,
  assigneeId: UuidSchema.nullable(),
  assigneeName: z.string().nullable(),
});
export type AssignRecruiterResponse = z.infer<typeof AssignRecruiterResponseSchema>;

/* ------------------------- offer and joining outcomes (Th6-420) ------------------------ */

export const OFFER_OUTCOMES = ['ACCEPTED', 'DECLINED', 'WITHDRAWN_BY_COMPANY'] as const;
export const OfferOutcomeSchema = z.enum(OFFER_OUTCOMES);
export type OfferOutcome = z.infer<typeof OfferOutcomeSchema>;

export const JOINING_OUTCOMES = ['JOINED', 'NO_SHOW', 'DEFERRED'] as const;
export const JoiningOutcomeSchema = z.enum(JOINING_OUTCOMES);
export type JoiningOutcome = z.infer<typeof JoiningOutcomeSchema>;

export const OUTCOME_NOTE_MAX_LENGTH = 1000;

export const RecordApplicationOutcomeRequestSchema = z
  .object({
    offerOutcome: OfferOutcomeSchema.optional(),
    joiningOutcome: JoiningOutcomeSchema.optional(),
    /** Date the candidate joined (or is due to join), YYYY-MM-DD. */
    joiningDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
      .optional(),
    note: z.string().trim().min(1).max(OUTCOME_NOTE_MAX_LENGTH).optional(),
  })
  .refine((v) => v.offerOutcome !== undefined || v.joiningOutcome !== undefined, {
    message: 'Record an offer outcome or a joining outcome.',
  });
export type RecordApplicationOutcomeRequest = z.infer<typeof RecordApplicationOutcomeRequestSchema>;

export const ApplicationOutcomeSchema = z.object({
  applicationId: UuidSchema,
  offerOutcome: OfferOutcomeSchema.nullable(),
  joiningOutcome: JoiningOutcomeSchema.nullable(),
  joiningDate: z.string().nullable(),
  recordedAt: IsoDateTimeSchema,
});
export type ApplicationOutcome = z.infer<typeof ApplicationOutcomeSchema>;

/* ------------------------------ conversion metrics (Th6-421) ------------------------------ */

export const ConversionMetricsQuerySchema = z.object({
  /** Optional window, ISO dates. */
  from: IsoDateTimeSchema.optional(),
  to: IsoDateTimeSchema.optional(),
});
export type ConversionMetricsQuery = z.infer<typeof ConversionMetricsQuerySchema>;

/** A rate over fewer applicants than this is noise, so the server withholds it. */
export const CONVERSION_MIN_SAMPLE = 5;

const ConversionRateSchema = z.object({
  /** Applications that reached the first stage. */
  entered: z.number().int().min(0),
  /** Of those, how many reached the next stage. */
  converted: z.number().int().min(0),
  /** converted / entered as a percentage, or null when nobody entered (never a divide-by-zero). */
  ratePercent: z.number().min(0).max(100).nullable(),
});

export const ConversionMetricsSchema = z.object({
  status: z.enum(['ready', 'empty']),
  shortlistToInterview: ConversionRateSchema,
  interviewToHire: ConversionRateSchema,
  from: IsoDateTimeSchema.nullable(),
  to: IsoDateTimeSchema.nullable(),
  calculatedAt: IsoDateTimeSchema,
});
export type ConversionMetrics = z.infer<typeof ConversionMetricsSchema>;
