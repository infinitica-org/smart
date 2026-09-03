import { CandidateOnboardingProfileSchema } from '@smart/contracts';

function joinLines(label: string, lines: string[]): string | null {
  const usable = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  if (usable.length === 0) return null;
  return `${label}: ${usable.join(' | ')}`;
}

/**
 * Person-level digest for SE-T04. Omits declared skills so the model cannot
 * treat a self-claimed skill as a verification target.
 */
export function buildCognitiveBioDigest(onboardingDetails: unknown): string | null {
  const parsed = CandidateOnboardingProfileSchema.safeParse(onboardingDetails);
  if (!parsed.success) return null;

  const profile = parsed.data;
  const education = joinLines(
    'Education',
    profile.education.map((row) =>
      [row.institutionName, row.degree, row.fieldOfStudy].filter(Boolean).join(', '),
    ),
  );
  const experience = joinLines(
    'Experience',
    profile.experiences.map((row) => {
      const description = row.description?.slice(0, 400) ?? '';
      return [row.role, row.company, description].filter(Boolean).join(' — ');
    }),
  );
  const preferences = joinLines('Preferences', profile.preferences);
  const linkedin = profile.linkedinUrl.length > 0 ? 'LinkedIn: provided' : 'LinkedIn: not provided';

  const digest = [education, experience, preferences, linkedin].filter(Boolean).join('\n');
  return digest.length >= 40 ? digest : `${digest}\nContext: early-career student profile.`;
}

export function isCognitiveProfileFresh(refreshedAt: Date, now: Date, windowDays: number): boolean {
  return now.getTime() - refreshedAt.getTime() < windowDays * 24 * 60 * 60 * 1000;
}
