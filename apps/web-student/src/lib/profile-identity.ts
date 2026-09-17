import type { AuthenticatedUser, CandidateEducationDto } from '@smart/contracts';

/** Primary college/institution for the identity card (education first, then account institution). */
export function primaryInstitutionName(
  education: CandidateEducationDto[],
  user: AuthenticatedUser | undefined,
): string | null {
  const current = education.find((entry) => entry.current);
  const entry = current ?? education[0];
  const fromEducation = entry?.institutionName?.trim();
  if (fromEducation) return fromEducation;

  const fromAccount = user?.institutionName?.trim();
  if (fromAccount) return fromAccount;

  return null;
}
