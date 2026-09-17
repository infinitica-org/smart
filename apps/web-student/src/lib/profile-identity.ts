import type { AuthenticatedUser, CandidateEducationDto } from '@smart/contracts';

function primaryEducationEntry(
  education: CandidateEducationDto[],
): CandidateEducationDto | undefined {
  return education.find((entry) => entry.current) ?? education[0];
}

function yearFromEducationDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/** Primary college/institution for the identity card (education first, then account institution). */
export function primaryInstitutionName(
  education: CandidateEducationDto[],
  user: AuthenticatedUser | undefined,
): string | null {
  const entry = primaryEducationEntry(education);
  const fromEducation = entry?.institutionName?.trim();
  if (fromEducation) return fromEducation;

  const fromAccount = user?.institutionName?.trim();
  if (fromAccount) return fromAccount;

  return null;
}

/** Department / field of study from the primary education record. */
export function primaryDepartmentName(education: CandidateEducationDto[]): string | null {
  const entry = primaryEducationEntry(education);
  const department = entry?.fieldOfStudy?.trim();
  return department || null;
}

/** Batch years from the primary education record, e.g. "Batch 2022 – 2026". */
export function primaryBatchLabel(education: CandidateEducationDto[]): string | null {
  const entry = primaryEducationEntry(education);
  if (!entry) return null;

  const startYear = yearFromEducationDate(entry.startDate);
  const endYear = yearFromEducationDate(entry.endDate);

  if (startYear != null && endYear != null) {
    return `Batch ${startYear} – ${endYear}`;
  }
  if (startYear != null && entry.current) {
    return `Batch ${startYear} – Present`;
  }
  if (startYear != null) {
    return `Batch ${startYear}`;
  }
  if (endYear != null) {
    return `Batch ${endYear}`;
  }
  return null;
}
