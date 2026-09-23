const TECHNICAL = new Set(['BEGINNER', 'INTERMEDIATE', 'PROFICIENT', 'ADVANCED', 'PROFESSIONAL']);
const LANGUAGE = new Set(['NATIVE', 'FLUENT', 'CONVERSATIONAL', 'BASIC']);

const TO_TECHNICAL: Record<string, string> = {
  BEGINNER: 'BEGINNER',
  NOVICE: 'BEGINNER',
  BASIC: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  WORKING: 'INTERMEDIATE',
  FAMILIAR: 'INTERMEDIATE',
  PROFICIENT: 'PROFICIENT',
  ADVANCED: 'ADVANCED',
  PROFESSIONAL: 'PROFESSIONAL',
  EXPERT: 'ADVANCED',
  COMPETENT: 'PROFICIENT',
  FLUENT: 'ADVANCED',
  NATIVE: 'ADVANCED',
};

const TO_LANGUAGE: Record<string, string> = {
  NATIVE: 'NATIVE',
  FLUENT: 'FLUENT',
  CONVERSATIONAL: 'CONVERSATIONAL',
  BASIC: 'BASIC',
  BEGINNER: 'BASIC',
  INTERMEDIATE: 'CONVERSATIONAL',
  ADVANCED: 'FLUENT',
  PROFESSIONAL: 'FLUENT',
};

/**
 * Gemini often emits skill-claim enums (PROFESSIONAL) on technical skills.
 * Map aliases before Zod so resume-parse does not fail closed on a valid resume.
 */
export function coerceGoogleStructuredOutput(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed;
  }
  const root = parsed as Record<string, unknown>;
  if (!Array.isArray(root.skills)) {
    return parsed;
  }

  return {
    ...root,
    skills: root.skills.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return row;
      }
      const skill = row as Record<string, unknown>;
      const type = skill.type === 'language' ? 'language' : 'technical';
      const raw =
        typeof skill.proficiency === 'string' ? skill.proficiency.trim().toUpperCase() : '';
      const proficiency =
        type === 'language'
          ? LANGUAGE.has(raw)
            ? raw
            : (TO_LANGUAGE[raw] ?? 'CONVERSATIONAL')
          : TECHNICAL.has(raw)
            ? raw
            : (TO_TECHNICAL[raw] ?? 'INTERMEDIATE');
      return { ...skill, type, proficiency };
    }),
  };
}
