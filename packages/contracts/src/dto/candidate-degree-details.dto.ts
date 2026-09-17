import { z } from 'zod';

export const CandidateDegreeSemesterSchema = z.object({
  semester: z.number().int().min(1).max(24),
  performancePercent: z.number().min(0).max(100).nullable().optional(),
  backlogsTotal: z.number().int().min(0).max(99).nullable().optional(),
  backlogsOngoing: z.number().int().min(0).max(99).nullable().optional(),
});
export type CandidateDegreeSemesterDto = z.infer<typeof CandidateDegreeSemesterSchema>;

/** College / degree program metadata stored on `CandidateEducation.degreeDetails`. */
export const CandidateDegreeDetailsSchema = z.object({
  rollNumber: z.string().max(64).optional(),
  currentSemester: z.number().int().min(1).max(24).optional(),
  semestersPerYear: z.number().int().min(1).max(4).default(2),
  lateralEntry: z.boolean().default(false),
  overallScorePercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  hasBacklog: z.boolean().optional(),
  semesters: z.array(CandidateDegreeSemesterSchema).max(24).default([]),
});
export type CandidateDegreeDetailsDto = z.infer<typeof CandidateDegreeDetailsSchema>;
