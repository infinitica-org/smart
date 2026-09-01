import { z } from 'zod';

/** Shared student profile payload for onboarding and the dashboard. Owner: Tino. */

const optionalUrl = z.union([z.url(), z.literal('')]).optional();

export const StudentProfileSkillProficiencySchema = z.enum([
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
  'Fluent',
  'Native',
  'Basic',
  'Native or Bilingual',
  'Conversational',
]);

export const StudentProfileBasicInfoSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  dob: z.string().max(32).optional(),
  gender: z.string().max(40).optional(),
  phoneNumber: z.string().max(32).optional(),
  phoneCountryCode: z.string().max(8).optional(),
  linkedinUrl: optionalUrl,
  currentCollege: z.string().max(200).optional(),
  summary: z.string().max(4000).optional(),
  permanentAddress: z.string().max(1000).optional(),
  currentAddress: z.string().max(1000).optional(),
  githubUrl: optionalUrl,
});
export type StudentProfileBasicInfo = z.infer<typeof StudentProfileBasicInfoSchema>;

export const StudentProfileEducationSchema = z.object({
  id: z.string().min(1),
  institutionName: z.string().min(1).max(200),
  degree: z.string().min(1).max(120),
  fieldOfStudy: z.string().min(1).max(120),
  startDate: z.string().min(1).max(32),
  endDate: z.string().max(32).optional(),
  current: z.boolean(),
  grade: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
});
export type StudentProfileEducation = z.infer<typeof StudentProfileEducationSchema>;

export const StudentProfileSkillSchema = z.object({
  id: z.string().min(1),
  language: z.string().min(1).max(80),
  proficiency: StudentProfileSkillProficiencySchema,
  verified: z.boolean(),
  type: z.enum(['technical', 'language']),
});
export type StudentProfileSkill = z.infer<typeof StudentProfileSkillSchema>;

export const StudentProfileProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  problem: z.string().min(1).max(4000),
  approach: z.string().min(1).max(4000),
  outcome: z.string().min(1).max(4000),
  loomUrl: optionalUrl,
  githubUrl: optionalUrl,
  verified: z.boolean(),
});
export type StudentProfileProject = z.infer<typeof StudentProfileProjectSchema>;

export const StudentProfileCertificationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  issueDate: z.string().min(1).max(32),
  credentialId: z.string().max(120).optional(),
  credentialUrl: optionalUrl,
});
export type StudentProfileCertification = z.infer<typeof StudentProfileCertificationSchema>;

export const StudentProfileExperienceSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().max(120),
  startDate: z.string().min(1).max(32),
  endDate: z.string().max(32).optional(),
  tags: z.array(z.string().max(100)).default([]),
  description: z.string().max(4000),
  documents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        createdAt: z.string(),
      }),
    )
    .default([]),
});
export type StudentProfileExperience = z.infer<typeof StudentProfileExperienceSchema>;

export const StudentProfileSubjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
});
export type StudentProfileSubject = z.infer<typeof StudentProfileSubjectSchema>;

export const StudentProfileDataSchema = z.object({
  basicInfo: StudentProfileBasicInfoSchema.optional(),
  education: z.array(StudentProfileEducationSchema).default([]),
  skills: z.array(StudentProfileSkillSchema).default([]),
  projects: z.array(StudentProfileProjectSchema).default([]),
  certifications: z.array(StudentProfileCertificationSchema).default([]),
  experiences: z.array(StudentProfileExperienceSchema).default([]),
  subjects: z.array(StudentProfileSubjectSchema).default([]),
  preferences: z.array(z.string().max(80)).max(50).default([]),
  dpdpConsent: z.boolean().default(false),
});
export type StudentProfileData = z.infer<typeof StudentProfileDataSchema>;

export const StudentProfileResponseSchema = z.object({
  profile: StudentProfileDataSchema,
  profileCompletion: z.number().int().min(0).max(100),
});
export type StudentProfileResponse = z.infer<typeof StudentProfileResponseSchema>;
