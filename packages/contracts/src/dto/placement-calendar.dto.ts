import { z } from 'zod';

export const PlacementCalendarEventTypeSchema = z.enum([
  'INTERVIEW_ROUND',
  'PPT',
  'ASSESSMENT',
  'OFFER_RELEASE',
]);
export type PlacementCalendarEventType = z.infer<typeof PlacementCalendarEventTypeSchema>;

export const PlacementCalendarEventSchema = z.object({
  id: z.string().uuid(),
  driveId: z.string().uuid(),
  companyId: z.string().uuid(),
  companyName: z.string(),
  title: z.string().min(1).max(200),
  eventType: PlacementCalendarEventTypeSchema,
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  location: z.string().max(200).optional().nullable(),
  meetingUrl: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().max(2000).optional().nullable(),
  createdById: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type PlacementCalendarEventDto = z.infer<typeof PlacementCalendarEventSchema>;

export const CreatePlacementCalendarEventSchema = z.object({
  driveId: z.string().uuid('Invalid drive ID'),
  companyId: z.string().uuid('Invalid company ID'),
  companyName: z.string().min(1, 'Company name is required').max(200),
  title: z.string().min(1, 'Title is required').max(200),
  eventType: PlacementCalendarEventTypeSchema,
  startAt: z.string().min(1, 'Start time is required'),
  endAt: z.string().min(1, 'End time is required'),
  location: z.string().max(200).optional().nullable().or(z.literal('')),
  meetingUrl: z.string().url('Invalid meeting URL').optional().nullable().or(z.literal('')),
  notes: z.string().max(2000).optional().nullable().or(z.literal('')),
});
export type CreatePlacementCalendarEventDto = z.infer<typeof CreatePlacementCalendarEventSchema>;

export const BranchCtcBreakdownSchema = z.object({
  branch: z.string(),
  studentCount: z.number().int().nonnegative(),
  averageCtcLpa: z.number().nonnegative(),
  maxCtcLpa: z.number().nonnegative(),
});
export type BranchCtcBreakdownDto = z.infer<typeof BranchCtcBreakdownSchema>;

export const PlacementCtcAnalyticsSchema = z.object({
  totalOffers: z.number().int().nonnegative(),
  acceptedOffers: z.number().int().nonnegative(),
  highestCtcLpa: z.number().nonnegative(),
  medianCtcLpa: z.number().nonnegative(),
  averageCtcLpa: z.number().nonnegative(),
  branchBreakdown: z.array(BranchCtcBreakdownSchema),
});
export type PlacementCtcAnalyticsDto = z.infer<typeof PlacementCtcAnalyticsSchema>;

export const VouchOfferLetterSchema = z.object({
  experienceId: z.string().uuid('Invalid experience ID'),
  driveId: z.string().uuid('Invalid drive ID').optional().nullable(),
  offeredCtcLpa: z.number().positive('Offered CTC must be a positive number'),
  designation: z.string().min(1, 'Designation is required').max(200),
  joiningDate: z.string().min(1, 'Joining date is required'),
  offerLetterUrl: z.string().url('Invalid offer letter URL'),
});
export type VouchOfferLetterDto = z.infer<typeof VouchOfferLetterSchema>;

export const VouchOfferLetterResponseSchema = z.object({
  success: z.boolean(),
  experienceId: z.string().uuid(),
  vouchedAt: z.string().datetime(),
  status: z.enum(['VERIFIED', 'UNDER_REVIEW', 'REJECTED']),
  message: z.string(),
});
export type VouchOfferLetterResponseDto = z.infer<typeof VouchOfferLetterResponseSchema>;

export const PlacementReportExportParamsSchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
  academicYear: z.string().optional(),
  branch: z.string().optional(),
});
export type PlacementReportExportParamsDto = z.infer<typeof PlacementReportExportParamsSchema>;
