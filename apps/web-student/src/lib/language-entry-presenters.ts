export { LANGUAGE_CARD_ACCENTS } from '@/lib/student-bento-accents';

const PROFICIENCY_TIER: Record<string, number> = {
  Elementary: 1,
  'Limited Working': 2,
  'Professional Working': 3,
  'Full Professional': 4,
  'Native or Bilingual': 5,
};

export function proficiencyTier(proficiency: string): number {
  return PROFICIENCY_TIER[proficiency] ?? 3;
}

export function proficiencySummary(proficiency: string): string {
  switch (proficiency) {
    case 'Native or Bilingual':
      return 'Native / bilingual';
    case 'Full Professional':
      return 'Full professional';
    case 'Professional Working':
      return 'Professional';
    case 'Limited Working':
      return 'Limited working';
    case 'Elementary':
      return 'Elementary';
    default:
      return proficiency;
  }
}
