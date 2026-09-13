import type { SkillPassThresholdsDto } from '@smart/contracts';

/**
 * INF-05: PRD v1 §7.3 example bars (configurable per skill, not a second cert grid).
 * Beginner: assessment only ≥ 0.60. Intermediate/Advanced: both components ≥ 0.60, 40/60 split.
 */
export const PRD_73_DEFAULT_PASS_THRESHOLDS: SkillPassThresholdsDto = {
  BEGINNER: { assessmentPass: 0.6, interviewPass: null, assessmentWeight: 1 },
  INTERMEDIATE: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
  ADVANCED: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
  PROFESSIONAL: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
};

/** Software & IT seed domain = TECH_FULLSTACK competencies (~18 topics; ticket asked ~15). */
export const TECH_FULLSTACK_SKILL_PASS_THRESHOLDS: Readonly<
  Record<string, SkillPassThresholdsDto>
> = {
  React: PRD_73_DEFAULT_PASS_THRESHOLDS,
  'Next.js': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'State management': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'Responsive CSS': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'REST API design': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'Async Node/NestJS': PRD_73_DEFAULT_PASS_THRESHOLDS,
  Middleware: PRD_73_DEFAULT_PASS_THRESHOLDS,
  Auth: PRD_73_DEFAULT_PASS_THRESHOLDS,
  'PostgreSQL queries': PRD_73_DEFAULT_PASS_THRESHOLDS,
  Indexing: PRD_73_DEFAULT_PASS_THRESHOLDS,
  'MongoDB CRUD': PRD_73_DEFAULT_PASS_THRESHOLDS,
  Transactions: PRD_73_DEFAULT_PASS_THRESHOLDS,
  'Git workflows': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'PR review': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'System design fundamentals': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'Justifying technical choices': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'Debugging aloud': PRD_73_DEFAULT_PASS_THRESHOLDS,
  'Trade-off articulation': PRD_73_DEFAULT_PASS_THRESHOLDS,
};

export function passThresholdsFor(trackCode: string, skillName: string): SkillPassThresholdsDto {
  if (trackCode === 'TECH_FULLSTACK') {
    const defined = TECH_FULLSTACK_SKILL_PASS_THRESHOLDS[skillName];
    if (defined) return defined;
  }
  return PRD_73_DEFAULT_PASS_THRESHOLDS;
}
