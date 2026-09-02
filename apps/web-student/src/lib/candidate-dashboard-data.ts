/** Shared mock fixtures + ATS stages for candidate console (CN-T05). */

export const ATS_STAGES = [
  'New Matches',
  'Shortlisted',
  'AI-Verified',
  'Interviewing',
  'Offer',
] as const;

export type AtsStage = (typeof ATS_STAGES)[number];

export type SkillStatus = 'Declared' | 'In verification' | 'Verified' | 'Locked' | 'Expiring';

export interface CandidateProfileFixture {
  firstName: string;
  lastName: string;
  headline: string;
  completionPercent: number;
  verificationStarted: boolean;
}

export const DEFAULT_PROFILE: CandidateProfileFixture = {
  firstName: 'Sathe',
  lastName: 'V',
  headline: 'Full-stack candidate · Bangalore',
  completionPercent: 68,
  verificationStarted: true,
};

export const SKILL_CHIPS: {
  name: string;
  proficiency: string;
  status: SkillStatus;
  lockedUntil?: string;
}[] = [
  { name: 'React', proficiency: 'Advanced', status: 'Verified' },
  { name: 'SQL', proficiency: 'Intermediate', status: 'In verification' },
  { name: 'System Design', proficiency: 'Beginner', status: 'Declared' },
  { name: 'Python', proficiency: 'Intermediate', status: 'Expiring' },
  { name: 'DSA', proficiency: 'Beginner', status: 'Locked', lockedUntil: '12 Oct 2026' },
];

export const APPLICATIONS: {
  id: string;
  role: string;
  company: string;
  location: string;
  appliedDate: string;
  stage: AtsStage;
  matchScore: number;
  why: string;
  description: string;
}[] = [
  {
    id: '1',
    role: 'Senior Full Stack Engineer',
    company: 'Acme Corp',
    location: 'Bangalore · Remote',
    appliedDate: 'Sep 01, 2026',
    stage: 'AI-Verified',
    matchScore: 92,
    why: 'Verified React + SQL align with the stack requirements.',
    description: 'Lead enterprise tools with React, Node.js, and distributed systems.',
  },
  {
    id: '2',
    role: 'Frontend Developer',
    company: 'Northwind',
    location: 'San Francisco · Remote',
    appliedDate: 'Aug 28, 2026',
    stage: 'Shortlisted',
    matchScore: 88,
    why: 'UI depth and React verification match this role.',
    description: 'Build performant, accessible components used by millions.',
  },
  {
    id: '3',
    role: 'Software Engineer II',
    company: 'Contoso',
    location: 'Hyderabad',
    appliedDate: 'Aug 15, 2026',
    stage: 'Interviewing',
    matchScore: 95,
    why: 'Strong systems focus; moved to interview after AI verify.',
    description: 'Azure compute — systems programming and cloud infrastructure.',
  },
];

export const UPCOMING_ASSESSMENTS = [
  {
    id: '1',
    title: 'Full Stack Engineering',
    company: 'Acme Corp',
    duration: '90 mins',
    type: 'Coding + System Design',
    deadline: 'Sep 05, 2026',
    status: 'Pending' as const,
  },
  {
    id: '2',
    title: 'React UI Challenge',
    company: 'Northwind',
    duration: '45 mins',
    type: 'Frontend Coding',
    deadline: 'Sep 03, 2026',
    status: 'Ready' as const,
  },
];

export const COMPLETED_ASSESSMENTS = [
  {
    id: '3',
    title: 'Data Structures & Algorithms',
    company: 'Contoso',
    duration: '60 mins',
    type: 'Coding',
    completedOn: 'Aug 20, 2026',
    score: '98%',
  },
];

export const UPCOMING_INTERVIEWS = [
  {
    id: '2',
    title: 'Behavioral & Culture Fit',
    company: 'Northwind',
    duration: '30 mins',
    type: 'AI Voice',
    scheduledFor: 'Tomorrow, 10:30 AM',
    systemCheckPassed: false,
  },
  {
    id: '4',
    title: 'Frontend Architecture',
    company: 'Stripe',
    duration: '60 mins',
    type: 'AI Avatar',
    scheduledFor: 'Sep 15, 4:00 PM',
    systemCheckPassed: true,
  },
];

export const COMPLETED_INTERVIEWS = [
  {
    id: '3',
    title: 'System Design Interview',
    company: 'Contoso',
    duration: '60 mins',
    type: 'AI Avatar',
    completedOn: 'Aug 25, 2026',
    score: '92/100',
  },
];

export const NEXT_ACTIONS = [
  { id: '1', label: 'Finish SQL verification', done: false, href: '/profile' },
  { id: '2', label: 'Start React UI Challenge', done: false, href: '/assessments' },
  { id: '3', label: 'Run interview system check', done: false, href: '/interviews' },
  { id: '4', label: 'Enable projects on public profile', done: true, href: '/public-profile' },
];

export function statusTone(status: SkillStatus): string {
  switch (status) {
    case 'Verified':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'In verification':
      return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    case 'Locked':
      return 'border-red-500/30 bg-red-500/10 text-red-400';
    case 'Expiring':
      return 'border-amber-400/50 bg-amber-500/10 text-amber-300';
    default:
      return 'border-white/10 bg-white/5 text-white/70';
  }
}

export function skillStatusToBadge(status: SkillStatus): string {
  switch (status) {
    case 'Declared':
      return 'DECLARED';
    case 'In verification':
      return 'IN_VERIFICATION';
    case 'Verified':
      return 'VERIFIED';
    case 'Locked':
      return 'LOCKED';
    case 'Expiring':
      return 'EXPIRING';
    default:
      return 'DECLARED';
  }
}
