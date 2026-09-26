import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

/**
 * UNI-05 — employer and event management (Th6-445 to Th6-451).
 *
 * "University" is an Institution and "employer" is a Company in the data model; jobs already carry both.
 * Every endpoint is scoped to the caller's own institution or company; another tenant's record is a 404.
 */

/* ------------------------------ Th6-445 / 446 campus access ------------------------------ */

export const CAMPUS_ACCESS_REASON_MIN = 5;
export const CAMPUS_LIST_MAX_LIMIT = 50;
export const CAMPUS_LIST_DEFAULT_LIMIT = 25;

export const CampusAccessRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'DENIED', 'REVOKED']);
export type CampusAccessRequestStatus = z.infer<typeof CampusAccessRequestStatusSchema>;

const ReasonSchema = z
  .string()
  .trim()
  .min(
    CAMPUS_ACCESS_REASON_MIN,
    `Give a reason of at least ${CAMPUS_ACCESS_REASON_MIN} characters.`,
  )
  .max(1000);

const ListPagingShape = {
  cursor: UuidSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CAMPUS_LIST_MAX_LIMIT)
    .default(CAMPUS_LIST_DEFAULT_LIMIT),
};

/** POST /employer/campus-access */
export const CreateCampusAccessRequestSchema = z.object({
  institutionId: UuidSchema,
  message: z.string().trim().max(1000).optional(),
});
export type CreateCampusAccessRequest = z.infer<typeof CreateCampusAccessRequestSchema>;

export const CampusAccessRequestDtoSchema = z.object({
  id: UuidSchema,
  institutionId: UuidSchema,
  status: CampusAccessRequestStatusSchema,
  message: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  decidedAt: IsoDateTimeSchema.nullable(),
});
export type CampusAccessRequestDto = z.infer<typeof CampusAccessRequestDtoSchema>;

/** GET /employer/campus-access — every partner university with this employer's standing there. */
export const EmployerCampusAccessRowSchema = z.object({
  institutionId: UuidSchema,
  institutionName: z.string(),
  /** NONE = never asked; otherwise the latest request/access status. */
  status: z.union([z.literal('NONE'), CampusAccessRequestStatusSchema]),
  reason: z.string().nullable(),
  requestId: UuidSchema.nullable(),
  updatedAt: IsoDateTimeSchema.nullable(),
});
export type EmployerCampusAccessRow = z.infer<typeof EmployerCampusAccessRowSchema>;

export const EmployerCampusAccessResponseSchema = z.object({
  /** False for an unverified employer: they may look but not send requests. */
  canRequest: z.boolean(),
  universities: z.array(EmployerCampusAccessRowSchema),
});
export type EmployerCampusAccessResponse = z.infer<typeof EmployerCampusAccessResponseSchema>;

/** GET /university/employer-requests */
export const UniversityEmployerRequestsQuerySchema = z.object({
  status: CampusAccessRequestStatusSchema.optional(),
  ...ListPagingShape,
});
export type UniversityEmployerRequestsQuery = z.infer<typeof UniversityEmployerRequestsQuerySchema>;

export const UniversityEmployerRequestRowSchema = z.object({
  id: UuidSchema,
  companyId: UuidSchema,
  companyName: z.string(),
  logoFileId: z.string().nullable(),
  verified: z.boolean(),
  industry: z.string().nullable(),
  openJobCount: z.number().int().min(0),
  message: z.string().nullable(),
  status: CampusAccessRequestStatusSchema,
  reason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  decidedAt: IsoDateTimeSchema.nullable(),
});
export type UniversityEmployerRequestRow = z.infer<typeof UniversityEmployerRequestRowSchema>;

export const UniversityEmployerRequestsResponseSchema = z.object({
  requests: z.array(UniversityEmployerRequestRowSchema),
  nextCursor: UuidSchema.nullable(),
});
export type UniversityEmployerRequestsResponse = z.infer<
  typeof UniversityEmployerRequestsResponseSchema
>;

/** POST /university/employer-requests/:id/decide — a denial must say why. */
export const DecideCampusAccessRequestSchema = z
  .object({
    decision: z.enum(['APPROVE', 'DENY']),
    reason: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'DENY' && (value.reason?.length ?? 0) < CAMPUS_ACCESS_REASON_MIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: `Give a reason of at least ${CAMPUS_ACCESS_REASON_MIN} characters.`,
      });
    }
  });
export type DecideCampusAccessRequest = z.infer<typeof DecideCampusAccessRequestSchema>;

export const DecideCampusAccessResponseSchema = z.object({
  request: UniversityEmployerRequestRowSchema,
});
export type DecideCampusAccessResponse = z.infer<typeof DecideCampusAccessResponseSchema>;

/** POST /university/employers/:companyId/revoke */
export const RevokeCampusAccessSchema = z.object({ reason: ReasonSchema });
export type RevokeCampusAccess = z.infer<typeof RevokeCampusAccessSchema>;

export const RevokeCampusAccessResponseSchema = z.object({
  companyId: UuidSchema,
  status: z.literal('REVOKED'),
  revokedAt: IsoDateTimeSchema,
});
export type RevokeCampusAccessResponse = z.infer<typeof RevokeCampusAccessResponseSchema>;

/* ---------------------------------- Th6-447 employers ---------------------------------- */

export const CampusEmployerStatusSchema = z.enum(['ACTIVE', 'REVOKED']);
export type CampusEmployerStatus = z.infer<typeof CampusEmployerStatusSchema>;

export const UniversityEmployersQuerySchema = z.object({
  status: CampusEmployerStatusSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  ...ListPagingShape,
});
export type UniversityEmployersQuery = z.infer<typeof UniversityEmployersQuerySchema>;

/** Aggregates only. No student is identifiable from this row. */
export const UniversityEmployerRowSchema = z.object({
  companyId: UuidSchema,
  companyName: z.string(),
  logoFileId: z.string().nullable(),
  industry: z.string().nullable(),
  status: CampusEmployerStatusSchema,
  approvedAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable(),
  openJobCount: z.number().int().min(0),
  applicantCount: z.number().int().min(0),
  hireCount: z.number().int().min(0),
  lastActivityAt: IsoDateTimeSchema.nullable(),
});
export type UniversityEmployerRow = z.infer<typeof UniversityEmployerRowSchema>;

export const UniversityEmployersResponseSchema = z.object({
  employers: z.array(UniversityEmployerRowSchema),
  nextCursor: UuidSchema.nullable(),
});
export type UniversityEmployersResponse = z.infer<typeof UniversityEmployersResponseSchema>;

/* ------------------------------ Th6-448 / 449 career events ------------------------------ */

export const CAREER_EVENT_TITLE_MAX = 200;
export const CAREER_EVENT_DESCRIPTION_MAX = 5000;

export const CareerEventAudienceSchema = z.enum(['STUDENTS', 'EMPLOYERS', 'BOTH']);
export type CareerEventAudience = z.infer<typeof CareerEventAudienceSchema>;

export const CareerEventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']);
export type CareerEventStatus = z.infer<typeof CareerEventStatusSchema>;

export const EventRegistrationStatusSchema = z.enum(['REGISTERED', 'WAITLISTED', 'CANCELLED']);
export type EventRegistrationStatus = z.infer<typeof EventRegistrationStatusSchema>;

export function isValidIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const TimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidIanaTimezone, 'Choose a valid IANA timezone, e.g. Asia/Kolkata.');

const CapacitySchema = z.number().int().min(1, 'Capacity must be at least 1.').nullish();

interface EventTimingFields {
  startsAt?: string;
  endsAt?: string;
}

/** Field rules that do not need the clock. "Starts in the future" is checked by the service and the form. */
function refineEventTiming(value: EventTimingFields, ctx: z.RefinementCtx): void {
  if (value.startsAt && value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must be after the start.' });
  }
}

export const CreateCareerEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(CAREER_EVENT_TITLE_MAX),
    description: z.string().trim().max(CAREER_EVENT_DESCRIPTION_MAX).default(''),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    timezone: TimezoneSchema,
    location: z.string().trim().max(300).nullish(),
    onlineUrl: z.url().max(500).nullish(),
    capacity: CapacitySchema,
    audience: CareerEventAudienceSchema.default('STUDENTS'),
    employerRegistration: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    refineEventTiming(value, ctx);
    if (!value.location?.trim() && !value.onlineUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['location'],
        message: 'Give a location or an online link.',
      });
    }
  });
export type CreateCareerEvent = z.infer<typeof CreateCareerEventSchema>;

/** PATCH /university/events/:id — every field optional; a change to time or place notifies registrants. */
export const UpdateCareerEventSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(CAREER_EVENT_TITLE_MAX).optional(),
    description: z.string().trim().max(CAREER_EVENT_DESCRIPTION_MAX).optional(),
    startsAt: IsoDateTimeSchema.optional(),
    endsAt: IsoDateTimeSchema.optional(),
    timezone: TimezoneSchema.optional(),
    location: z.string().trim().max(300).nullish(),
    onlineUrl: z.url().max(500).nullish(),
    capacity: CapacitySchema,
    audience: CareerEventAudienceSchema.optional(),
    employerRegistration: z.boolean().optional(),
  })
  .superRefine(refineEventTiming);
export type UpdateCareerEvent = z.infer<typeof UpdateCareerEventSchema>;

export const CancelCareerEventSchema = z.object({ reason: ReasonSchema });
export type CancelCareerEvent = z.infer<typeof CancelCareerEventSchema>;

export const CareerEventDtoSchema = z.object({
  id: UuidSchema,
  institutionId: UuidSchema,
  title: z.string(),
  description: z.string(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema,
  timezone: z.string(),
  location: z.string().nullable(),
  onlineUrl: z.string().nullable(),
  capacity: z.number().int().nullable(),
  audience: CareerEventAudienceSchema,
  employerRegistration: z.boolean(),
  status: CareerEventStatusSchema,
  cancelReason: z.string().nullable(),
  version: z.number().int(),
  updatedAt: IsoDateTimeSchema,
  registeredCount: z.number().int().min(0),
  waitlistedCount: z.number().int().min(0),
});
export type CareerEventDto = z.infer<typeof CareerEventDtoSchema>;

export const UniversityEventsQuerySchema = z.object({
  status: CareerEventStatusSchema.optional(),
  ...ListPagingShape,
});
export type UniversityEventsQuery = z.infer<typeof UniversityEventsQuerySchema>;

export const UniversityEventsResponseSchema = z.object({
  events: z.array(CareerEventDtoSchema),
  nextCursor: UuidSchema.nullable(),
});
export type UniversityEventsResponse = z.infer<typeof UniversityEventsResponseSchema>;

/** Staff view of who signed up: names and organisation only, for running the event. */
export const EventRegistrantSchema = z.object({
  registrationId: UuidSchema,
  fullName: z.string(),
  kind: z.enum(['STUDENT', 'EMPLOYER']),
  companyName: z.string().nullable(),
  status: EventRegistrationStatusSchema,
  registeredAt: IsoDateTimeSchema,
});
export type EventRegistrant = z.infer<typeof EventRegistrantSchema>;

export const UniversityEventDetailSchema = z.object({
  event: CareerEventDtoSchema,
  registrants: z.array(EventRegistrantSchema),
});
export type UniversityEventDetail = z.infer<typeof UniversityEventDetailSchema>;

/* ------------------------- Th6-450 / 451 registration and discovery ------------------------- */

export const EventRegistrationDtoSchema = z.object({
  eventId: UuidSchema,
  status: EventRegistrationStatusSchema,
  registeredAt: IsoDateTimeSchema,
  cancelledAt: IsoDateTimeSchema.nullable(),
});
export type EventRegistrationDto = z.infer<typeof EventRegistrationDtoSchema>;

/** An event as a student or employer sees it. */
export const PublicCareerEventSchema = z.object({
  id: UuidSchema,
  institutionId: UuidSchema,
  institutionName: z.string(),
  title: z.string(),
  description: z.string(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema,
  timezone: z.string(),
  location: z.string().nullable(),
  onlineUrl: z.string().nullable(),
  capacity: z.number().int().nullable(),
  /** Null when the event has no capacity limit. */
  capacityLeft: z.number().int().min(0).nullable(),
  cancelled: z.boolean(),
  myRegistration: EventRegistrationStatusSchema.nullable(),
});
export type PublicCareerEvent = z.infer<typeof PublicCareerEventSchema>;

export const StudentEventsQuerySchema = z.object({
  from: IsoDateTimeSchema.optional(),
  ...ListPagingShape,
});
export type StudentEventsQuery = z.infer<typeof StudentEventsQuerySchema>;

export const PublicCareerEventsResponseSchema = z.object({
  events: z.array(PublicCareerEventSchema),
  nextCursor: UuidSchema.nullable(),
});
export type PublicCareerEventsResponse = z.infer<typeof PublicCareerEventsResponseSchema>;
