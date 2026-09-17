import { z } from 'zod';

/** Minimum academic thresholds stored on a job opening / placement drive. */
export const JobOpeningEligibilityCriteriaSchema = z.object({
  minSscPercentage: z.number().min(0).max(100).optional(),
  minHscPercentage: z.number().min(0).max(100).optional(),
  /** Compared against CGPA on a 0–10 scale (`cgpa * 10`). */
  minCollegePercentage: z.number().min(0).max(100).optional(),
  /** When false, students with an active backlog are not eligible. Default: allowed. */
  backlogsAllowed: z.boolean().optional(),
});
export type JobOpeningEligibilityCriteria = z.infer<typeof JobOpeningEligibilityCriteriaSchema>;

export type StudentAcademicEligibilityInput = {
  cgpa: number | null | undefined;
  sscPercentage: number | null | undefined;
  hscPercentage: number | null | undefined;
  hasActiveBacklog: boolean | null | undefined;
};

export function collegePercentageFromCgpa(cgpa: number): number {
  return cgpa * 10;
}

export function studentMeetsJobOpeningEligibility(
  student: StudentAcademicEligibilityInput,
  criteria: JobOpeningEligibilityCriteria,
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (criteria.minSscPercentage !== undefined) {
    if (student.sscPercentage == null || student.sscPercentage < criteria.minSscPercentage) {
      reasons.push(`Minimum 10th/SSC ${criteria.minSscPercentage}% required.`);
    }
  }

  if (criteria.minHscPercentage !== undefined) {
    if (student.hscPercentage == null || student.hscPercentage < criteria.minHscPercentage) {
      reasons.push(`Minimum 12th/diploma ${criteria.minHscPercentage}% required.`);
    }
  }

  if (criteria.minCollegePercentage !== undefined) {
    if (student.cgpa == null) {
      reasons.push(`Minimum college ${criteria.minCollegePercentage}% (CGPA) required.`);
    } else {
      const collegePercent = collegePercentageFromCgpa(student.cgpa);
      if (collegePercent < criteria.minCollegePercentage) {
        reasons.push(`Minimum college ${criteria.minCollegePercentage}% required.`);
      }
    }
  }

  const backlogsAllowed = criteria.backlogsAllowed !== false;
  if (!backlogsAllowed && student.hasActiveBacklog === true) {
    reasons.push('Active backlogs are not allowed for this drive.');
  }

  return { eligible: reasons.length === 0, reasons };
}
