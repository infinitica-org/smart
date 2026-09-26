import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { MESSAGE_MAX_LENGTH, MessageBodySchema } from './messaging.dto.js';
import {
  ReadinessEvidenceSchema,
  ReadinessIdentitySchema,
  ReadinessProficiencySchema,
  ReadinessSkillDemonstrationSchema,
  EvidenceRequirementKindSchema,
} from './student-readiness.dto.js';

/**
 * UNI-04 — the university (TPO / advisor) student readiness dashboard (Th6-437 to Th6-444).
 *
 * Scope rules the API enforces (not the UI): a university user only ever sees students of their own
 * institution and, when the staff account has a campus label, only that campus. A student outside
 * that scope is reported as not found. Interview recordings are never part of any of these payloads.
 */

/** Derived from the student's skill claims; nothing is stored under this name. */
export const UniversityVerificationStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'VERIFIED',
]);
export type UniversityVerificationStatus = z.infer<typeof UniversityVerificationStatusSchema>;

export const UNIVERSITY_ROSTER_MAX_LIMIT = 50;
export const UNIVERSITY_ROSTER_DEFAULT_LIMIT = 25;

export const UniversityRosterQuerySchema = z.object({
  verificationStatus: UniversityVerificationStatusSchema.optional(),
  program: z.string().trim().min(1).max(120).optional(),
  gradYear: z.coerce.number().int().min(1950).max(2100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  cursor: UuidSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(UNIVERSITY_ROSTER_MAX_LIMIT)
    .default(UNIVERSITY_ROSTER_DEFAULT_LIMIT),
});
export type UniversityRosterQuery = z.infer<typeof UniversityRosterQuerySchema>;

export const UniversityRosterRowSchema = z.object({
  userId: UuidSchema,
  fullName: z.string(),
  email: z.string(),
  program: z.string().nullable(),
  graduationYear: z.number().int().nullable(),
  verificationStatus: UniversityVerificationStatusSchema,
  verifiedSkillCount: z.number().int().min(0),
  declaredSkillCount: z.number().int().min(0),
  /** True when onboarding is unfinished or nothing has been submitted for verification yet. */
  needsAssistance: z.boolean(),
});
export type UniversityRosterRow = z.infer<typeof UniversityRosterRowSchema>;

export const UniversityRosterResponseSchema = z.object({
  items: z.array(UniversityRosterRowSchema),
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: UuidSchema.nullable(),
});
export type UniversityRosterResponse = z.infer<typeof UniversityRosterResponseSchema>;

/** Th6-441 — one required evidence item the student has not yet met. */
export const MissingEvidenceItemSchema = z.object({
  skillCode: z.string(),
  skillName: z.string(),
  level: z.string(),
  requirement: EvidenceRequirementKindSchema,
  /** Plain-language description of what the student needs to provide. */
  needed: z.string(),
});
export type MissingEvidenceItem = z.infer<typeof MissingEvidenceItemSchema>;

/** Th6-443 — one application and where it stands. */
export const UniversityOpportunityRowSchema = z.object({
  applicationId: UuidSchema,
  roleTitle: z.string(),
  companyName: z.string(),
  stage: z.string(),
  appliedAt: IsoDateTimeSchema,
  offerOutcome: z.string().nullable(),
  joiningOutcome: z.string().nullable(),
  joiningDate: z.string().nullable(),
});
export type UniversityOpportunityRow = z.infer<typeof UniversityOpportunityRowSchema>;

export const UniversityStudentSummarySchema = z.object({
  student: UniversityRosterRowSchema.extend({ batchName: z.string().nullable() }),
  /** Completeness (evidence) and proficiency stay separate values; they are never combined. */
  verification: z.object({
    identity: ReadinessIdentitySchema,
    evidence: ReadinessEvidenceSchema,
    skillDemonstration: ReadinessSkillDemonstrationSchema,
    proficiency: ReadinessProficiencySchema,
  }),
  /** Required evidence only. Optional evidence that is unavailable is never listed here. */
  missingEvidence: z.array(MissingEvidenceItemSchema),
  opportunities: z.array(UniversityOpportunityRowSchema),
});
export type UniversityStudentSummary = z.infer<typeof UniversityStudentSummarySchema>;

/** Th6-442 — a university staff message to one student. `subject`, when given, becomes the first line. */
export const UniversityMessageStudentRequestSchema = z
  .object({
    subject: z.string().trim().min(1).max(120).optional(),
    body: MessageBodySchema,
  })
  .refine(
    (v) => (v.subject ? v.subject.length + 2 + v.body.length : v.body.length) <= MESSAGE_MAX_LENGTH,
    {
      message: `Subject and message together can be at most ${MESSAGE_MAX_LENGTH} characters.`,
      path: ['body'],
    },
  );
export type UniversityMessageStudentRequest = z.infer<typeof UniversityMessageStudentRequestSchema>;
