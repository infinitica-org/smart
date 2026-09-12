import type { ProficiencyLevel } from './skill-levels.js';

/** SDE v4 form seed for the short diagnostic — not the student's declared level. */
export const SKILL_VERIFICATION_FORM_PROFICIENCY: ProficiencyLevel = 'BEGINNER';

/** Competency intelligence ceiling while discovering demonstrated proficiency. */
export const SKILL_VERIFICATION_DISCOVERY_TARGET: ProficiencyLevel = 'PROFESSIONAL';
