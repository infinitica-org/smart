/**
 * INF-06 — Question bank types.
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

export type QuestionFormat = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'CODING';

export type QuestionLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

export type QuestionStream =
  'UNIVERSAL' | 'SOFTWARE_DEVELOPMENT' | 'DATA_SCIENCE_ANALYTICS' | 'AI_ML_ENGINEERING';

export type ReviewStatus = 'PENDING_HUMAN_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

export interface QuestionOption {
  readonly [key: string]: string;
}

export interface Question {
  /** Stable identifier — format: <STREAM_PREFIX>-<SKILL_NUM>-<SEQ> e.g. UNI-01-001 */
  readonly id: string;
  readonly stream: QuestionStream;
  /** Matches `SkillDefinition.code` from INF-05 skills.ts */
  readonly skillCode: string;
  readonly skillName: string;
  readonly level: QuestionLevel;
  readonly format: QuestionFormat;
  readonly prompt: string;
  /** Present for MCQ only — key is option letter (A/B/C/D), value is display text */
  readonly options: Readonly<Record<string, string>> | null;
  /** Correct answer key for MCQ/T-F; model answer text for open-ended formats */
  readonly answer: string | null;
  /** Explanation shown post-submission (MCQ/T-F) or AI grading rubric (open-ended) */
  readonly rubric: string | null;
  readonly reviewStatus: ReviewStatus;
}
