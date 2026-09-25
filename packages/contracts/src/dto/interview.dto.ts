import { z } from 'zod';

export const InterviewTypeSchema = z.enum([
  'TECHNICAL',
  'SYSTEM_DESIGN',
  'HR',
  'CULTURE_FIT',
  'PROJECT_DEFENSE',
]);
export type InterviewType = z.infer<typeof InterviewTypeSchema>;

export const InterviewStatusSchema = z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
export type InterviewStatus = z.infer<typeof InterviewStatusSchema>;

export const ScorecardRecommendationSchema = z.enum([
  'STRONG_HIRE',
  'HIRE',
  'NO_HIRE',
  'STRONG_NO_HIRE',
]);
export type ScorecardRecommendation = z.infer<typeof ScorecardRecommendationSchema>;

/** DTO representing an available or booked interview slot */
export const InterviewSlotDtoSchema = z.object({
  id: z.string().uuid(),
  openingId: z.string().uuid(),
  companyId: z.string().uuid(),
  interviewerId: z.string().uuid(),
  interviewerName: z.string(),
  interviewerEmail: z.string().email(),
  interviewType: InterviewTypeSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
  timezone: z.string().default('Asia/Kolkata'),
  meetingUrl: z.string().url().nullable(),
  isBooked: z.boolean(),
  bookedCandidateId: z.string().uuid().nullable(),
  applicationId: z.string().uuid().nullable(),
  status: InterviewStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InterviewSlotDto = z.infer<typeof InterviewSlotDtoSchema>;

/** Request DTO to create a new interview slot by recruiter */
export const CreateInterviewSlotDtoSchema = z.object({
  openingId: z.string().uuid(),
  interviewerId: z.string().uuid(),
  interviewerName: z.string().min(1),
  interviewerEmail: z.string().email(),
  interviewType: InterviewTypeSchema.default('TECHNICAL'),
  startTime: z.string(),
  durationMinutes: z.number().int().min(15).max(180).default(45),
  timezone: z.string().default('Asia/Kolkata'),
  meetingUrl: z.string().url().optional(),
});
export type CreateInterviewSlotDto = z.infer<typeof CreateInterviewSlotDtoSchema>;

/** Request DTO for candidate to book an interview slot */
export const BookInterviewSlotDtoSchema = z.object({
  slotId: z.string().uuid(),
  applicationId: z.string().uuid(),
});
export type BookInterviewSlotDto = z.infer<typeof BookInterviewSlotDtoSchema>;

/** DTO for interviewer evaluation scorecard */
export const InterviewScorecardDtoSchema = z.object({
  id: z.string().uuid(),
  slotId: z.string().uuid(),
  applicationId: z.string().uuid(),
  interviewerId: z.string().uuid(),
  interviewerName: z.string(),
  technicalDepthScore: z.number().min(1).max(5),
  problemSolvingScore: z.number().min(1).max(5),
  communicationScore: z.number().min(1).max(5),
  cultureFitScore: z.number().min(1).max(5),
  recommendation: ScorecardRecommendationSchema,
  feedbackNotes: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type InterviewScorecardDto = z.infer<typeof InterviewScorecardDtoSchema>;

/** Request DTO to submit an interviewer scorecard */
export const SubmitScorecardDtoSchema = z.object({
  slotId: z.string().uuid(),
  applicationId: z.string().uuid(),
  technicalDepthScore: z.number().min(1).max(5),
  problemSolvingScore: z.number().min(1).max(5),
  communicationScore: z.number().min(1).max(5),
  cultureFitScore: z.number().min(1).max(5),
  recommendation: ScorecardRecommendationSchema,
  feedbackNotes: z.string().min(5),
});
export type SubmitScorecardDto = z.infer<typeof SubmitScorecardDtoSchema>;
