'use client';

import Link from 'next/link';
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  MoreVertical,
  Pause,
  Play,
  Share2,
  TrendingUp,
  Video,
} from 'lucide-react';
import { useProfileStore } from '@/lib/stores/profile-store';
import { cn } from '@smart/ui';

export default function DashboardPage() {
  const { data } = useProfileStore();
  const firstName = data.basicInfo?.firstName || 'Satheshwaran';
  const fullName = data.basicInfo
    ? `${data.basicInfo.firstName} ${data.basicInfo.lastName}`.trim()
    : 'Satheshwaran';

  return (
    <div className="relative mx-auto w-full max-w-[1400px] pb-16 pt-2">
      <div className="relative space-y-10 z-10">
        {/* Top Stats Section */}
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-4xl font-medium tracking-tight text-white md:text-[44px]">
              Welcome back, {firstName}
            </h1>

            {/* KPI pills */}
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-white/50 tracking-wide">Applications</span>
                <div className="flex h-[38px] w-32 items-center rounded-full bg-[#1c1c1c] px-5">
                  <span className="text-sm font-medium text-white">2%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-white/50 tracking-wide">Interviews</span>
                <div className="flex h-[38px] w-32 items-center rounded-full bg-[#00fad0] px-5">
                  <span className="text-sm font-medium text-black">%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-white/50 tracking-wide">Profile Completion</span>
                <div
                  className="flex h-[38px] w-32 items-center rounded-full bg-[#1c1c1c] px-5"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.02) 4px, rgba(255,255,255,0.02) 8px)',
                  }}
                >
                  <span className="text-sm font-medium text-white/40">%</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-white/50 tracking-wide">Confidence</span>
                <div className="flex h-[38px] w-32 items-center rounded-full bg-transparent px-5 border border-white/10">
                  <span className="text-sm font-medium text-white">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-12 xl:pt-4">
            <div className="flex items-center gap-4">
              <Briefcase className="h-5 w-5 text-white/40" />
              <div className="flex flex-col">
                <span className="text-[40px] leading-none font-light tabular-nums text-white">
                  78
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 mt-1">
                  Active Apps
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Video className="h-5 w-5 text-white/40" />
              <div className="flex flex-col">
                <span className="text-[40px] leading-none font-light tabular-nums text-white">
                  56
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 mt-1">
                  Interviews
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <FileText className="h-5 w-5 text-white/40" />
              <div className="flex flex-col">
                <span className="text-[40px] leading-none font-light tabular-nums text-white">
                  203
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 mt-1">
                  Assessments
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left col */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="relative flex h-[380px] flex-col justify-end overflow-hidden rounded-[28px] p-6 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800&h=800"
                className="absolute inset-0 -z-20 h-full w-full object-cover mix-blend-luminosity opacity-90"
                alt="Profile"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-[#111]/90 via-[#334]/30 to-transparent mix-blend-multiply" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/60 to-transparent" />
              <div className="relative flex items-end justify-between">
                <div>
                  <h2 className="font-display text-2xl font-medium text-white">{fullName}</h2>
                  <p className="mt-1 text-[13px] text-white/60">Software Engineer</p>
                </div>
                <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-md">
                  $,2
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[28px] bg-[#1a1a1a] p-6">
              <div>
                <h3 className="font-medium text-white">Public profile</h3>
                <p className="mt-1 text-[13px] text-white/40">Shareable preview for employers.</p>
              </div>
              <div className="mt-2 flex items-center gap-3 rounded-[20px] bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
                  {firstName[0]}
                  {data.basicInfo?.lastName?.[0] ?? 'V'}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">{fullName}</p>
                  <p className="text-[11px] text-white/40">3 verified badges</p>
                </div>
              </div>
              <Link
                href="/public-profile"
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#00fad0] px-4 py-3 text-[13px] font-semibold text-black hover:bg-[#7dffe6] transition-colors"
              >
                <Share2 className="h-4 w-4" /> Preview
              </Link>
            </div>
          </div>

          {/* Middle col */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Progress */}
              <div className="flex h-[380px] flex-col justify-between rounded-[28px] bg-[#1a1a1a] p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Progress</h3>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-[44px] leading-none font-light text-white">
                        6.1<span className="text-[28px] ml-1">h</span>
                      </span>
                      <span className="text-[10px] uppercase leading-[1.3] tracking-wide text-white/40">
                        Work
                        <br />
                        Time this
                        <br />
                        week
                      </span>
                    </div>
                  </div>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                    <TrendingUp className="h-4 w-4 text-white/70" />
                  </button>
                </div>

                {/* Bar chart mockup */}
                <div className="relative mt-auto flex h-40 items-end justify-between gap-1 px-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                    const h = [35, 50, 45, 65, 90, 30, 20][i];
                    const isToday = i === 4;
                    return (
                      <div
                        key={i}
                        className="group relative flex flex-col items-center gap-4 w-full"
                      >
                        {isToday && (
                          <div className="absolute -top-12 z-10 whitespace-nowrap rounded-full bg-[#00fad0]/20 px-3 py-1 text-[11px] font-medium text-[#00fad0]">
                            h 2m
                          </div>
                        )}
                        <div className="relative flex w-2.5 flex-col justify-end overflow-hidden rounded-full bg-white/5 h-28">
                          <div
                            className={cn(
                              'w-full rounded-full transition-all duration-500',
                              isToday ? 'bg-[#00fad0]' : 'bg-white/20 group-hover:bg-white/30',
                            )}
                            style={{ height: `${h}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-white/40 uppercase">
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verified Skills */}
              <div className="flex h-[380px] flex-col rounded-[28px] bg-[#1a1a1a] p-7">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-lg font-medium text-white">Verified skills</h3>
                  <Link href="/profile" className="text-[13px] text-[#00fad0] hover:underline">
                    Manage
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#00fad0]/30 bg-[#00fad0]/10 px-3 py-2 text-[13px] text-[#00fad0]">
                    <span className="font-medium">React</span>
                    <span className="opacity-70 text-[11px]">Verified</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[13px] text-blue-400">
                    <span className="font-medium">TypeScript</span>
                    <span className="opacity-70 text-[11px]">In progress</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white/60">
                    <span className="font-medium">Node.js</span>
                    <span className="opacity-70 text-[11px]">Declared</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#00fad0]/30 bg-[#00fad0]/10 px-3 py-2 text-[13px] text-[#00fad0]">
                    <span className="font-medium">Tailwind CSS</span>
                    <span className="opacity-70 text-[11px]">Verified</span>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-400">
                    <span className="font-medium">AWS</span>
                    <span className="opacity-70 text-[11px]">Expiring</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Application Tracker */}
            <div className="rounded-[28px] bg-[#1a1a1a] p-7">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-medium text-white">Application tracker</h3>
                <Link href="/applications" className="text-[13px] text-[#00fad0] hover:underline">
                  View all
                </Link>
              </div>
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[15px] font-medium text-white">Frontend Developer</p>
                      <p className="text-[12px] text-white/40 mt-0.5">Stripe</p>
                    </div>
                    <span className="text-[11px] font-medium text-[#00fad0] uppercase tracking-wider">
                      Interviewing
                    </span>
                  </div>
                  <div className="flex h-1.5 gap-1.5">
                    <div className="flex-1 rounded-full bg-[#00fad0]" />
                    <div className="flex-1 rounded-full bg-[#00fad0]" />
                    <div className="flex-1 rounded-full bg-[#00fad0]" />
                    <div className="flex-1 rounded-full bg-[#00fad0]/30 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-[#00fad0] w-1/2" />
                    </div>
                    <div className="flex-1 rounded-full bg-white/10" />
                  </div>
                  <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/30 px-1">
                    <span>New</span>
                    <span className="ml-1">Shortlist</span>
                    <span className="ml-1">Verified</span>
                    <span className="mr-1">Interview</span>
                    <span>Offer</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[15px] font-medium text-white">Full Stack Engineer</p>
                      <p className="text-[12px] text-white/40 mt-0.5">Vercel</p>
                    </div>
                    <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">
                      AI-Verified
                    </span>
                  </div>
                  <div className="flex h-1.5 gap-1.5">
                    <div className="flex-1 rounded-full bg-blue-500" />
                    <div className="flex-1 rounded-full bg-blue-500" />
                    <div className="flex-1 rounded-full bg-blue-500" />
                    <div className="flex-1 rounded-full bg-white/10" />
                    <div className="flex-1 rounded-full bg-white/10" />
                  </div>
                  <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/30 px-1">
                    <span>New</span>
                    <span className="ml-1">Shortlist</span>
                    <span className="ml-1">Verified</span>
                    <span className="mr-1">Interview</span>
                    <span>Offer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            {/* Onboarding Overview */}
            <div className="rounded-[28px] bg-[#1a1a1a] p-7 h-[180px] flex flex-col justify-between">
              <h3 className="text-lg font-medium text-white">Onboarding</h3>
              <div className="flex items-end justify-between">
                <div className="flex gap-2">
                  <div className="flex flex-col items-center gap-2.5">
                    <span className="text-[11px] font-medium text-white/40">%</span>
                    <div className="rounded-full bg-[#00fad0] px-4 py-1.5 text-[11px] font-semibold text-black">
                      Task
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <span className="text-[11px] font-medium text-white/40">2%</span>
                    <div className="h-[26px] w-[38px] rounded-full bg-white/5" />
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <span className="text-[11px] font-medium text-white/40">%</span>
                    <div className="h-[26px] w-[38px] rounded-full bg-white/5" />
                  </div>
                </div>
                <span className="text-[40px] leading-none font-light tabular-nums text-white">
                  18%
                </span>
              </div>
            </div>

            {/* Onboarding Tasks */}
            <div className="flex-1 rounded-[28px] bg-[#1a1a1a] p-7">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-medium text-white">Onboarding Task</h3>
                <span className="text-2xl font-light text-white">2/8</span>
              </div>

              <div className="space-y-6">
                {[
                  { icon: Video, title: 'Interview', time: 'Sep 13, 08:30', done: true },
                  { icon: TrendingUp, title: 'Team Meeting', time: 'Sep 13, 10:30', done: true },
                  { icon: FileText, title: 'Project Update', time: 'Sep 13, 13:00', done: false },
                  { icon: FileText, title: 'Discuss Q3 Goals', time: 'Sep 13, 14:45', done: false },
                  { icon: FileText, title: 'HR Policy Review', time: 'Sep 13, 16:30', done: false },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/60">
                      <t.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-medium text-white">{t.title}</p>
                      <p className="text-[12px] text-white/40 mt-0.5">{t.time}</p>
                    </div>
                    {t.done ? (
                      <CheckCircle2 className="h-5 w-5 text-[#00fad0]" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-white/5" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
