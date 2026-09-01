'use client';

import Link from 'next/link';
import {
  Award,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  Lock,
  Share2,
  Video,
} from 'lucide-react';
import { useProfileStore } from '@/lib/stores/profile-store';

/** Company ATS stages — application tracker must mirror these (Design Brief §4.3 / §4.4). */
const ATS_STAGES = ['New Matches', 'Shortlisted', 'AI-Verified', 'Interviewing', 'Offer'] as const;

type SkillChipStatus = 'Declared' | 'In verification' | 'Verified' | 'Locked' | 'Expiring';

const SKILL_CHIPS: {
  name: string;
  proficiency: string;
  status: SkillChipStatus;
  lockedUntil?: string;
}[] = [
  { name: 'React', proficiency: 'Advanced', status: 'Verified' },
  { name: 'SQL', proficiency: 'Intermediate', status: 'In verification' },
  { name: 'System Design', proficiency: 'Beginner', status: 'Declared' },
  { name: 'Python', proficiency: 'Intermediate', status: 'Expiring' },
  { name: 'DSA', proficiency: 'Beginner', status: 'Locked', lockedUntil: '12 Oct 2026' },
];

const APPLICATIONS: {
  id: string;
  role: string;
  company: string;
  stage: (typeof ATS_STAGES)[number];
}[] = [
  { id: '1', role: 'Full Stack Engineer', company: 'Acme Corp', stage: 'AI-Verified' },
  { id: '2', role: 'Frontend Developer', company: 'Northwind', stage: 'Shortlisted' },
];

function chipTone(status: SkillChipStatus): string {
  if (status === 'Verified') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (status === 'In verification') return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  if (status === 'Locked') return 'bg-red-500/15 text-red-400 border-red-500/30';
  if (status === 'Expiring') return 'border-amber-400/70 text-amber-400 bg-amber-500/10';
  return 'bg-white/5 text-gray-300 border-white/10';
}

export default function DashboardPage() {
  const { data, getCompletionPercentage } = useProfileStore();
  const basicInfo = data.basicInfo;
  const completion = getCompletionPercentage();
  const firstName = basicInfo?.firstName || 'there';

  /** Empty state before verification starts (Design Brief §4.3 Dashboard + §6 Empty). */
  const verificationStarted =
    data.skills.some((skill: { verified: boolean }) => skill.verified) || data.skills.length > 0;
  const showEmpty = !verificationStarted && completion === 0;

  const skills = showEmpty ? [] : SKILL_CHIPS;
  const applications = showEmpty ? [] : APPLICATIONS;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-12 select-none">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-medium tracking-tight text-gray-900 dark:text-white">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Home — metrics, verified skills, applications, and your public card.
          </p>
        </div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00fad0] text-[#161616] text-sm font-semibold"
        >
          Continue profile
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Applications', value: applications.length, icon: Briefcase },
          { label: 'Interviews', value: showEmpty ? 0 : 1, icon: Video },
          { label: 'Assessments', value: showEmpty ? 0 : 2, icon: FileText },
          { label: 'Profile complete', value: `${String(completion)}%`, icon: Award },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[32px] border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]"
          >
            <card.icon className="w-5 h-5 text-gray-400 mb-4" />
            <p className="text-4xl font-display font-light tracking-tighter text-gray-900 dark:text-white">
              {card.value}
            </p>
            <p className="text-xs uppercase tracking-wider text-gray-500 mt-2">{card.label}</p>
          </div>
        ))}
      </div>

      {showEmpty ? (
        <div className="rounded-[32px] border border-dashed border-gray-300 dark:border-white/15 bg-white/50 dark:bg-white/[0.03] p-12 text-center">
          <h2 className="text-2xl font-display text-gray-900 dark:text-white mb-2">
            Verification has not started
          </h2>
          <p className="text-sm text-gray-500 max-w-lg mx-auto mb-6">
            Declare a skill on your profile to begin verification. Applications and a public card
            appear after that — this empty state is intentional, not an error.
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 dark:border-white/15 text-sm font-medium text-gray-900 dark:text-white"
          >
            Declare a skill
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Verified skill chips — same five-state language as profile / TPO / company */}
          <section className="xl:col-span-8 rounded-[32px] border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Verified skill chips
              </h2>
              <Link href="/profile" className="text-xs text-[#00967c] dark:text-[#00fad0]">
                Manage skills
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill.name}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${chipTone(skill.status)}`}
                  title={
                    skill.status === 'Locked' && skill.lockedUntil
                      ? `Locked until ${skill.lockedUntil}`
                      : skill.status
                  }
                >
                  {skill.status === 'Verified' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {skill.status === 'Locked' && <Lock className="w-3.5 h-3.5" />}
                  {skill.name}
                  <span className="opacity-70">{skill.proficiency}</span>
                  <span className="opacity-80">· {skill.status}</span>
                  {skill.status === 'Locked' && skill.lockedUntil && (
                    <span className="opacity-70">until {skill.lockedUntil}</span>
                  )}
                </span>
              ))}
            </div>
          </section>

          {/* Public profile card */}
          <section className="xl:col-span-4 rounded-[32px] border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-6 flex flex-col min-h-[220px]">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Public profile
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Shareable, view-only. You choose which sections employers see.
            </p>
            <div className="rounded-2xl bg-gray-100 dark:bg-black/30 p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {basicInfo ? `${basicInfo.firstName} ${basicInfo.lastName}` : 'Your public card'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {skills.filter((s) => s.status === 'Verified').length} verified badges
              </p>
            </div>
            <Link
              href="/public-profile"
              className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-semibold"
            >
              <Share2 className="w-4 h-4" />
              Preview public profile
            </Link>
          </section>

          {/* Application tracker — timeline mirrors company ATS */}
          <section className="xl:col-span-12 rounded-[32px] border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Application tracker
              </h2>
              <Link href="/applications" className="text-xs text-[#00967c] dark:text-[#00fad0]">
                My Applications
              </Link>
            </div>
            {applications.length === 0 ? (
              <p className="text-sm text-gray-500">No applications yet.</p>
            ) : (
              <ul className="space-y-6">
                {applications.map((app) => (
                  <li key={app.id} className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="md:w-56 shrink-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {app.role}
                      </p>
                      <p className="text-xs text-gray-500">{app.company}</p>
                    </div>
                    <div className="flex-1 flex gap-1">
                      {ATS_STAGES.map((stage) => {
                        const current = ATS_STAGES.indexOf(app.stage);
                        const idx = ATS_STAGES.indexOf(stage);
                        const done = idx <= current;
                        return (
                          <div key={stage} className="flex-1 min-w-0">
                            <div
                              className={`h-1.5 rounded-full ${done ? 'bg-[#00fad0]' : 'bg-gray-200 dark:bg-white/10'}`}
                            />
                            <p className="text-[10px] text-gray-500 mt-2 truncate hidden sm:block">
                              {stage}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
