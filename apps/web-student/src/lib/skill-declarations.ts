import { SKILL_DEFINITIONS, type ProficiencyLevel, type SkillStream } from '@smart/contracts';

/** Candidate skill declaration statuses for CN-T04 / SE-T01. */
export type SkillVerificationStatus = 'DECLARED' | 'IN_VERIFICATION' | 'VERIFIED' | 'LOCKED';

export type DeclaredSkill = {
  id: string;
  skillCode: string;
  skillName: string;
  domain: 'SOFTWARE_IT';
  stream: SkillStream;
  proficiency: ProficiencyLevel;
  verificationStatus: SkillVerificationStatus;
  /** ISO date (YYYY-MM-DD) when status is LOCKED. */
  lockedUntil?: string;
  declaredAt: string;
};

export const SKILL_DECLARATIONS_STORAGE_KEY = 'smart.candidate.skill-declarations';

export const SOFTWARE_IT_DOMAIN_LABEL = 'Software & IT';

export const STREAM_LABELS: Record<SkillStream, string> = {
  UNIVERSAL: 'Universal Core',
  SOFTWARE_DEVELOPMENT: 'Software Development',
  DATA_SCIENCE_ANALYTICS: 'Data Science & Analytics',
  AI_ML_ENGINEERING: 'AI/ML Engineering',
};

export const PROFICIENCY_OPTIONS: readonly ProficiencyLevel[] = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'PROFESSIONAL',
] as const;

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  PROFESSIONAL: 'Professional',
};

/** Seed examples so Declared / In verification / Verified / Locked+cooldown all render. */
export function seedSkillDeclarations(): DeclaredSkill[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'seed-declared',
      skillCode: 'OBJECT_ORIENTED_PROGRAMMING',
      skillName: 'Object-oriented programming',
      domain: 'SOFTWARE_IT',
      stream: 'UNIVERSAL',
      proficiency: 'BEGINNER',
      verificationStatus: 'DECLARED',
      declaredAt: now,
    },
    {
      id: 'seed-verified',
      skillCode: 'PROGRAMMING_FUNDAMENTALS_LOGIC',
      skillName: 'Programming fundamentals & logic',
      domain: 'SOFTWARE_IT',
      stream: 'UNIVERSAL',
      proficiency: 'INTERMEDIATE',
      verificationStatus: 'VERIFIED',
      declaredAt: now,
    },
    {
      id: 'seed-in-verification',
      skillCode: 'GIT_VERSION_CONTROL',
      skillName: 'Git & version control',
      domain: 'SOFTWARE_IT',
      stream: 'UNIVERSAL',
      proficiency: 'BEGINNER',
      verificationStatus: 'IN_VERIFICATION',
      declaredAt: now,
    },
    {
      id: 'seed-locked',
      skillCode: 'SYSTEM_DESIGN_ARCHITECTURE',
      skillName: 'System design & architecture',
      domain: 'SOFTWARE_IT',
      stream: 'SOFTWARE_DEVELOPMENT',
      proficiency: 'ADVANCED',
      verificationStatus: 'LOCKED',
      lockedUntil: '2026-09-30',
      declaredAt: now,
    },
  ];
}

export function skillsForStream(stream: SkillStream) {
  return SKILL_DEFINITIONS.filter((s) => s.domain === 'SOFTWARE_IT' && s.stream === stream);
}

export function loadSkillDeclarations(): DeclaredSkill[] {
  if (typeof window === 'undefined') return seedSkillDeclarations();
  try {
    const raw = window.localStorage.getItem(SKILL_DECLARATIONS_STORAGE_KEY);
    if (!raw) {
      const seeded = seedSkillDeclarations();
      window.localStorage.setItem(SKILL_DECLARATIONS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as DeclaredSkill[];
    return Array.isArray(parsed) ? parsed : seedSkillDeclarations();
  } catch {
    return seedSkillDeclarations();
  }
}

export function saveSkillDeclarations(skills: DeclaredSkill[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SKILL_DECLARATIONS_STORAGE_KEY, JSON.stringify(skills));
}

/**
 * SE-T01 seam — queue a declared skill for verification.
 * Real worker wiring lands in SE-T01; this mock acknowledges the enqueue.
 */
export async function queueSkillVerification(
  skillId: string,
): Promise<{ queued: true; skillId: string }> {
  await Promise.resolve();
  return { queued: true, skillId };
}

export function createDeclarations(input: {
  skillCodes: string[];
  proficiency: ProficiencyLevel;
  existing: DeclaredSkill[];
}): { next: DeclaredSkill[]; created: DeclaredSkill[] } {
  const declaredAt = new Date().toISOString();
  const existingCodes = new Set(input.existing.map((s) => s.skillCode));
  const created: DeclaredSkill[] = [];

  for (const code of input.skillCodes) {
    if (existingCodes.has(code)) continue;
    const def = SKILL_DEFINITIONS.find((s) => s.code === code);
    if (!def || def.domain !== 'SOFTWARE_IT') continue;
    created.push({
      id: crypto.randomUUID(),
      skillCode: def.code,
      skillName: def.name,
      domain: 'SOFTWARE_IT',
      stream: def.stream,
      proficiency: input.proficiency,
      verificationStatus: 'DECLARED',
      declaredAt,
    });
  }

  return { next: [...input.existing, ...created], created };
}
