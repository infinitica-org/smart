import type { PublicCompetencyEvidenceSummary } from '@smart/contracts';

export function mapStudentCapabilitiesToSummaries(
  rows: ReadonlyArray<{
    skillCode: string | null;
    capabilityLabel: string;
    proficiency: string;
    confidenceScore: number;
    evidenceRefs: string[];
  }>,
): PublicCompetencyEvidenceSummary[] {
  return rows.slice(0, 12).map((row) => ({
    skillCode: row.skillCode,
    capabilityLabel: row.capabilityLabel,
    proficiency: row.proficiency,
    confidenceScore: row.confidenceScore,
    evidenceSnippets: (row.evidenceRefs ?? []).slice(0, 5),
  }));
}
