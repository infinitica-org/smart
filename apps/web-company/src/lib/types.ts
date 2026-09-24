export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
export const SKILL_LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
export const levelRank = (level: SkillLevel): number => SKILL_LEVELS.indexOf(level);

export type JobStatus = 'Active' | 'Draft' | 'Paused' | 'Closed';

export type Job = {
  id: string;
  title: string;
  applicants: number;
  status: JobStatus;
  skills: { name: string; level: SkillLevel }[];
  location?: string;
  type?: string;
  salary?: string;
  description?: string;
};

export type Student = {
  id: string;
  name: string;
  school: string;
  major: string;
  trust: number;
  skill: string;
  level: SkillLevel;
  endorsed: boolean;
  certification: boolean;
  projectDefended: boolean;
  evidence: string[];
};

export type Applicant = {
  id: string;
  jobId: string;
  name: string;
  school: string;
  trust: number;
  skill: string;
  level: SkillLevel;
  endorsed: boolean;
  projectDefended: boolean;
};

export type PipelineStage = 'Applied' | 'Reviewing' | 'Interviewing' | 'Hired';
export const PIPELINE_STAGES: PipelineStage[] = ['Applied', 'Reviewing', 'Interviewing', 'Hired'];

export type Message = { from: 'them' | 'me'; text: string; timestamp?: string };
export type Conversation = {
  id: string;
  name: string;
  job: string;
  messages: Message[];
};

export type Teammate = {
  name: string;
  email: string;
  role: string;
  status: 'Registered' | 'Invited';
};

export type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: string;
};

export type Review = {
  id: string;
  stars: number;
  author: string;
  text: string;
  status: string;
};
