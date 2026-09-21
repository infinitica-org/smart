import type { AuthenticatedUser, CandidateEducationDto } from '@smart/contracts';

function primaryEducationEntry(
  education: CandidateEducationDto[],
): CandidateEducationDto | undefined {
  return education.find((entry) => entry.current) ?? education[0];
}

/** School/college only — board is stored in `institutionName` as "School · Board" for K-12. */
export function institutionNameWithoutBoard(institutionName: string): string {
  const trimmed = institutionName.trim();
  if (!trimmed.includes(' · ')) return trimmed;
  const [school] = trimmed.split(' · ', 2);
  return school?.trim() || trimmed;
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
  if (fromEducation) return institutionNameWithoutBoard(fromEducation);

  const fromAccount = user?.institutionName?.trim();
  if (fromAccount) return institutionNameWithoutBoard(fromAccount);

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
