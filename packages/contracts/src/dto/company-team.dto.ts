import { z, EmailSchema, IsoDateTimeSchema, UuidSchema } from './common.js';
import { COMPANY_MEMBER_ROLES } from '../domain/company-permissions.js';

/** EMP-02 — company profile, details and team. Shared by client and server (one Zod schema). */

export const CompanyMemberRoleSchema = z.enum(COMPANY_MEMBER_ROLES);

/** Employee-count bands for the public profile (stored as an enum; registration keeps its own bands). */
export const COMPANY_EMPLOYEE_COUNTS = [
  'E_1_10',
  'E_11_50',
  'E_51_200',
  'E_201_500',
  'E_501_1000',
  'E_1000_PLUS',
] as const;
export type CompanyEmployeeCount = (typeof COMPANY_EMPLOYEE_COUNTS)[number];
export const CompanyEmployeeCountSchema = z.enum(COMPANY_EMPLOYEE_COUNTS, {
  message: 'Choose an employee count from the list.',
});
export const COMPANY_EMPLOYEE_COUNT_LABELS: Record<CompanyEmployeeCount, string> = {
  E_1_10: '1–10',
  E_11_50: '11–50',
  E_51_200: '51–200',
  E_201_500: '201–500',
  E_501_1000: '501–1000',
  E_1000_PLUS: '1000+',
};

export const COMPANY_INDUSTRIES = [
  'Software & Technology',
  'IT Services & Consulting',
  'Banking & Financial Services',
  'Healthcare & Life Sciences',
  'Education & EdTech',
  'E-commerce & Retail',
  'Manufacturing & Engineering',
  'Telecommunications',
  'Media & Entertainment',
  'Automotive',
  'Energy & Utilities',
  'Logistics & Supply Chain',
  'Consulting & Professional Services',
  'Government & Public Sector',
  'Other',
] as const;
export type CompanyIndustry = (typeof COMPANY_INDUSTRIES)[number];
export const CompanyIndustrySchema = z.enum(COMPANY_INDUSTRIES, {
  message: 'Choose an industry from the list.',
});

export const COMPANY_ABOUT_MAX_LENGTH = 2000;
export const MAX_ADDITIONAL_LOCATIONS = 10;
export const COMPANY_BENEFIT_MAX_LENGTH = 120;
export const MAX_COMPANY_BENEFITS = 20;

const LocationSchema = z.string().trim().min(2).max(200);

export const CompanySocialLinksSchema = z
  .object({
    linkedin: z.url().max(255).optional(),
    twitter: z.url().max(255).optional(),
    facebook: z.url().max(255).optional(),
    instagram: z.url().max(255).optional(),
    youtube: z.url().max(255).optional(),
  })
  .strict();
export type CompanySocialLinks = z.infer<typeof CompanySocialLinksSchema>;

/** Editable part of the public company profile (PATCH /employer/company body; all fields optional). */
export const UpdateCompanyProfileRequestSchema = z
  .object({
    displayName: z.string().trim().min(2).max(200),
    logoFileId: z.string().trim().min(1).max(512).nullable(),
    website: z.url().max(255).nullable(),
    about: z.string().trim().max(COMPANY_ABOUT_MAX_LENGTH).nullable(),
    benefits: z
      .array(z.string().trim().min(1).max(COMPANY_BENEFIT_MAX_LENGTH))
      .max(MAX_COMPANY_BENEFITS),
    socialLinks: CompanySocialLinksSchema,
    industry: CompanyIndustrySchema,
    employeeCount: CompanyEmployeeCountSchema,
    headquarters: LocationSchema,
    additionalLocations: z.array(LocationSchema).max(MAX_ADDITIONAL_LOCATIONS),
  })
  .partial();
export type UpdateCompanyProfileRequest = z.infer<typeof UpdateCompanyProfileRequestSchema>;

export const CompanyProfileSchema = z.object({
  companyId: UuidSchema,
  slug: z.string(),
  displayName: z.string(),
  logoUrl: z.string().nullable(),
  website: z.string().nullable(),
  about: z.string().nullable(),
  benefits: z.array(z.string()),
  socialLinks: CompanySocialLinksSchema,
  industry: z.string().nullable(),
  employeeCount: CompanyEmployeeCountSchema.nullable(),
  headquarters: z.string().nullable(),
  additionalLocations: z.array(z.string()),
  version: z.number().int(),
  /** Driven only by the server's verification status; the UI must not infer it. */
  isVerified: z.boolean(),
  verifiedAt: IsoDateTimeSchema.nullable(),
});
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const LocationSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});
export const LocationSearchResponseSchema = z.object({ locations: z.array(z.string()) });
export type LocationSearchResponse = z.infer<typeof LocationSearchResponseSchema>;

/* ----------------------------------- team ---------------------------------- */

export const CompanyMemberSchema = z.object({
  id: UuidSchema,
  fullName: z.string(),
  email: z.string(),
  role: CompanyMemberRoleSchema,
  status: z.enum(['ACTIVE', 'INVITED', 'DEACTIVATED']),
  deactivatedAt: IsoDateTimeSchema.nullable(),
});
export type CompanyMember = z.infer<typeof CompanyMemberSchema>;
export const ListCompanyMembersResponseSchema = z.object({ members: z.array(CompanyMemberSchema) });
export type ListCompanyMembersResponse = z.infer<typeof ListCompanyMembersResponseSchema>;

export const InviteRecruiterRequestSchema = z.object({
  email: EmailSchema,
  fullName: z.string().trim().min(2).max(200),
  /** Owner-only escape hatch for an invitee whose email is not on the company domain. */
  allowExternalDomain: z.boolean().default(false),
});
export type InviteRecruiterRequest = z.infer<typeof InviteRecruiterRequestSchema>;

export const UpdateCompanyMemberRoleRequestSchema = z.object({ role: CompanyMemberRoleSchema });
export type UpdateCompanyMemberRoleRequest = z.infer<typeof UpdateCompanyMemberRoleRequestSchema>;

export const DeactivateCompanyMemberRequestSchema = z.object({
  /** Teammate who takes over the deactivated member's open candidates and conversations. */
  reassignToMemberId: UuidSchema.optional(),
  reason: z.string().trim().max(500).optional(),
});
export type DeactivateCompanyMemberRequest = z.infer<typeof DeactivateCompanyMemberRequestSchema>;
