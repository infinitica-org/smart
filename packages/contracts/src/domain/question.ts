import { z } from 'zod';

/**
 * INF-06 — Question bank types and Zod schemas.
 *
 * A Question is the atomic unit of an assessment. Questions are linked to a
 * skill (via `skillCode`, which resolves against `SKILL_DEFINITIONS` from
 * INF-05) and a proficiency level. The `reviewStatus` field tracks the
 * human-review lifecycle: questions must reach APPROVED before they can be
 * served to students.
 *
 * `options` is only present for MCQ questions. `rubric` holds the model
 * answer for SHORT_ANSWER / LONG_ANSWER / CODING; for MCQ / TRUE_FALSE it
 * holds the explanation shown after submission.
 *
 * Owner: Vedika G (INF-06)
 */

export const QUESTION_FORMATS = [
  'MCQ',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'CODING',
  /** Professional-only — the 25-min incident/debug scenario gate (see INF-05 DEBUG_SCENARIO). */
  'DEBUG_SCENARIO',
] as const;
export const QuestionFormatSchema = z.enum(QUESTION_FORMATS);
export type QuestionFormat = z.infer<typeof QuestionFormatSchema>;

export const QUESTION_LEVELS = [
  'BEGINNER',
  'INTERMEDIATE',
  'PROFICIENT',
  'ADVANCED',
  'PROFESSIONAL',
] as const;
export const QuestionLevelSchema = z.enum(QUESTION_LEVELS);
export type QuestionLevel = z.infer<typeof QuestionLevelSchema>;

export const QUESTION_STREAMS = [
  'UNIVERSAL',
  'SOFTWARE_DEVELOPMENT',
  'DATA_SCIENCE_ANALYTICS',
  'AI_ML_ENGINEERING',
] as const;
export const QuestionStreamSchema = z.enum(QUESTION_STREAMS);
export type QuestionStream = z.infer<typeof QuestionStreamSchema>;

export const REVIEW_STATUSES = [
  'PENDING_HUMAN_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_REVISION',
] as const;
export const ReviewStatusSchema = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const QuestionOptionSchema = z.record(z.string(), z.string());
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const QuestionSchema = z.object({
  /** Stable identifier — format: <STREAM_PREFIX>-<SKILL_NUM>-<SEQ> e.g. UNI-01-001 */
  id: z.string(),
  stream: QuestionStreamSchema,
  /** Matches `SkillDefinition.code` from INF-05 skills.ts */
  skillCode: z.string(),
  skillName: z.string(),
  level: QuestionLevelSchema,
  format: QuestionFormatSchema,
  prompt: z.string(),
  /** Present for MCQ only — key is option letter (A/B/C/D), value is display text */
  options: QuestionOptionSchema.nullable(),
  /** Correct answer key for MCQ/T-F; model answer text for open-ended formats */
  answer: z.string().nullable(),
  /** Explanation shown post-submission (MCQ/T-F) or AI grading rubric (open-ended) */
  rubric: z.string().nullable(),
  reviewStatus: ReviewStatusSchema,
});
export type Question = z.infer<typeof QuestionSchema>;
