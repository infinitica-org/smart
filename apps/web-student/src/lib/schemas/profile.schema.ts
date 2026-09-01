import { z } from 'zod';
import {
  StudentProfileBasicInfoSchema,
  StudentProfileCertificationSchema,
  StudentProfileDataSchema,
  StudentProfileEducationSchema,
  StudentProfileProjectSchema,
  StudentProfileSkillSchema,
  StudentProfileExperienceSchema,
  StudentProfileSubjectSchema,
  type StudentProfileBasicInfo,
  type StudentProfileCertification,
  type StudentProfileData,
  type StudentProfileEducation,
  type StudentProfileProject,
  type StudentProfileSkill,
  type StudentProfileExperience,
  type StudentProfileSubject,
} from '@smart/contracts';

export const BasicInfoSchema = StudentProfileBasicInfoSchema.extend({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  linkedinUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
export type BasicInfo = StudentProfileBasicInfo;

export const EducationSchema = StudentProfileEducationSchema.extend({
  institutionName: z.string().min(2, 'Institution name is required'),
  degree: z.string().min(2, 'Degree is required'),
  fieldOfStudy: z.string().min(2, 'Field of study is required'),
});
export type Education = StudentProfileEducation;

export const SkillSchema = StudentProfileSkillSchema.extend({
  language: z.string().min(1, 'Skill/Language name is required'),
});
export type Skill = StudentProfileSkill;

export const ProjectSchema = StudentProfileProjectSchema.extend({
  title: z.string().min(3, 'Title is required').max(100),
  problem: z.string().min(10, 'Please describe the problem'),
  approach: z.string().min(10, 'Please describe your approach'),
  outcome: z.string().min(10, 'Please describe the outcome'),
  loomUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
export type Project = StudentProfileProject;

export const CertificationSchema = StudentProfileCertificationSchema.extend({
  name: z.string().min(3, 'Certification name is required'),
  issuer: z.string().min(2, 'Issuer is required'),
  credentialUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});
export type Certification = StudentProfileCertification;

export const ExperienceSchema = StudentProfileExperienceSchema.extend({
  role: z.string().min(2, 'Role is required'),
  company: z.string().min(2, 'Company is required'),
});
export type Experience = StudentProfileExperience;

export const SubjectSchema = StudentProfileSubjectSchema.extend({
  name: z.string().min(2, 'Subject name is required'),
});
export type Subject = StudentProfileSubject;

export const ProfileDataSchema = StudentProfileDataSchema;
export type ProfileData = StudentProfileData;
