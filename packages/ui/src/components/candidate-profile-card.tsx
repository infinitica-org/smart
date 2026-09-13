import type { HTMLAttributes, ReactNode } from 'react';
import type { Tier } from '@smart/contracts';
import {
  Mail,
  Phone,
  ExternalLink,
  MonitorPlay,
  Brain,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Layers,
  MapPin,
  GraduationCap,
  Award,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Code2,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { TierBadge } from './badge';
import { VerificationBadge } from './verification-badge';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function getLoomEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('loom.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (
        parts.length >= 2 &&
        (parts[0] === 'share' || parts[0] === 'watch' || parts[0] === 'embed')
      ) {
        const videoId = parts[1];
        return `https://www.loom.com/embed/${videoId}`;
      }
    }
  } catch {
    // Return null if parsing fails
  }
  return null;
}

export interface CandidateSkill {
  name: string;
  status:
    | 'DECLARED'
    | 'IN_PROGRESS'
    | 'IN_VERIFICATION'
    | 'PENDING_REVIEW'
    | 'LOCKED'
    | 'VERIFIED'
    | 'EXPIRING'
    | 'EXPIRING_SOON'
    | 'BEGINNER_REATTEMPT'
    | string;
  icon?: string;
}

export interface CandidateProject {
  title: string;
  description: string;
  stack: string[];
  loomUrl?: string;
  githubUrl?: string;
  isVerified?: boolean;
  isTeamProject?: boolean;
  dateRange?: string;
  duration?: string;
}

export interface CognitiveCommSummary {
  cognitiveScore?: number; // 0 - 100 or percentile
  cognitiveStrengths?: string[];
  communicationScore?: number; // 0 - 100
  communicationSummary?: string;
  overallNotes?: string;
}

export interface CandidateProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  candidateId: string;
  displayName: string;
  profilePhotoUrl?: string | null;
  trackName: string;
  headlineTier: Tier;
  skills: CandidateSkill[];

  jobTitle?: string;
  quote?: string;
  tags?: string[];
  matchScore?: number;

  contactInfo?: {
    email?: string;
    phone?: string;
    linkedIn?: string;
    github?: string;
  };

  academicDetails?: {
    gpa?: string;
    graduationYear?: number;
    batchName?: string;
    location?: string;
  };

  aiExplanation?: {
    summary: string;
    score?: number; // MatchScore (0 - 100)
    tone?: 'brand' | 'info' | 'warning' | 'success' | 'danger';
    fitLabel?: string;
    insightTags?: string[];
  };

  cognitiveCommSummary?: CognitiveCommSummary;

  projects?: CandidateProject[];

  actions?: ReactNode;

  onViewAllCompetencies?: () => void;
}

function getSkillIcon(skillName: string) {
  const lower = skillName.toLowerCase();
  if (lower.includes('typescript')) {
    return (
      <div className="w-6 h-6 rounded bg-[#007ACC]/20 border border-[#007ACC]/40 flex items-center justify-center text-[#007ACC] font-mono text-3xs font-black shrink-0">
        TS
      </div>
    );
  }
  if (lower.includes('react') || lower.includes('next')) {
    return (
      <div className="w-6 h-6 rounded bg-[#61DAFB]/20 border border-[#61DAFB]/40 flex items-center justify-center text-[#61DAFB] shrink-0">
        <Code2 className="w-3.5 h-3.5" />
      </div>
    );
  }
  if (lower.includes('node')) {
    return (
      <div className="w-6 h-6 rounded bg-[#5FA04E]/20 border border-[#5FA04E]/40 flex items-center justify-center text-[#5FA04E] shrink-0">
        <Code2 className="w-3.5 h-3.5" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
      <Code2 className="w-3.5 h-3.5" />
    </div>
  );
}

export function CandidateProfileCard({
  candidateId: _candidateId,
  displayName,
  profilePhotoUrl,
  trackName,
  headlineTier,
  skills,
  jobTitle,
  quote,
  tags,
  matchScore: _matchScore,
  contactInfo,
  academicDetails,
  aiExplanation,
  cognitiveCommSummary,
  projects,
  actions,
  onViewAllCompetencies,
  className,
  ...props
}: CandidateProfileCardProps) {
  const displayJobTitle = jobTitle || trackName;
  const displayQuote = quote || 'Building scalable solutions for a better tomorrow.';
  const displayTags = tags || ['Full Stack', 'Open to Opportunities'];

  return (
    <div
      className={cn('w-full max-w-[1400px] mx-auto space-y-5 text-gray-200 font-sans', className)}
      role="article"
      aria-label={`Candidate Profile: ${displayName}`}
      {...props}
    >
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium px-1">
        <span>SMART</span>
        <span>&rsaquo;</span>
        <span>Candidates</span>
        <span>&rsaquo;</span>
        <span className="text-white font-semibold">{displayName}</span>
      </div>

      {/* 1. CANDIDATE HERO CARD */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#111516] p-6 shadow-2xl transition-all">
        {/* Subtle mesh background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-gradient-to-l from-[#00E5D4]/30 via-purple-500/10 to-transparent" />
        <svg
          className="absolute right-0 top-0 h-full w-1/2 opacity-15 pointer-events-none stroke-[#00E5D4]/30"
          viewBox="0 0 400 200"
          fill="none"
        >
          <path d="M 100 20 C 200 80, 250 10, 400 120" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M 50 100 C 150 160, 300 40, 400 180" strokeWidth="1" />
        </svg>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left Avatar & Identity Info */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar Circle with Teal Ring & Status Dot */}
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#00E5D4] bg-gradient-to-br from-[#1a2123] to-[#0f1314] p-0.5 shadow-[0_0_20px_rgba(0,229,212,0.2)]">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={`${displayName} profile photo`}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="font-heading text-2xl font-extrabold text-[#00E5D4]">
                    {displayName.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#111516]"
                title="Active Candidate"
              />
            </div>

            {/* Name, Title, Badges & Contact */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-2xl font-extrabold text-white tracking-tight">
                  {displayName}
                </h1>
              </div>

              <p className="text-sm font-medium text-gray-400">{displayJobTitle}</p>

              {/* Badges line */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <TierBadge tier={headlineTier} showLabel={false} />
                {displayTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs font-semibold text-gray-300"
                  >
                    {tag === 'Open to Opportunities' ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Clock className="h-3 w-3 text-gray-400" />
                    )}
                    {tag}
                  </span>
                ))}
              </div>

              {/* Contact / Social links */}
              {contactInfo && (
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-400">
                  {contactInfo.email && (
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="flex items-center gap-1.5 hover:text-[#00E5D4] transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 text-gray-500" />
                      <span>{contactInfo.email}</span>
                    </a>
                  )}
                  {contactInfo.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      <span>{contactInfo.phone}</span>
                    </span>
                  )}
                  {contactInfo.linkedIn && (
                    <a
                      href={contactInfo.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-[#00E5D4] transition-colors"
                    >
                      <LinkedinIcon className="h-3.5 w-3.5 text-gray-500" />
                      <span>LinkedIn</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                  )}
                  {contactInfo.github && (
                    <a
                      href={contactInfo.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-[#00E5D4] transition-colors"
                    >
                      <GithubIcon className="h-3.5 w-3.5 text-gray-500" />
                      <span>GitHub</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Quote Block */}
          {displayQuote && (
            <div className="hidden lg:flex flex-col items-end justify-start max-w-xs text-right opacity-80 pt-1">
              <span className="text-2xl text-[#00E5D4]/40 font-serif leading-none">&ldquo;</span>
              <p className="text-xs italic text-gray-300 font-serif -mt-2 leading-relaxed">
                {displayQuote}
              </p>
              <span className="text-2xl text-[#00E5D4]/40 font-serif leading-none">&rdquo;</span>
            </div>
          )}
        </div>

        {/* Academic Details Bottom Bar */}
        {academicDetails && (
          <div className="relative z-10 mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/[0.08] pt-4 text-xs">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="h-4 w-4 text-gray-500 shrink-0" />
              <div>
                <span className="block text-3xs uppercase font-bold text-gray-500 tracking-wider">
                  Batch
                </span>
                <span className="font-semibold text-white">
                  {academicDetails.batchName || 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Award className="h-4 w-4 text-gray-500 shrink-0" />
              <div>
                <span className="block text-3xs uppercase font-bold text-gray-500 tracking-wider">
                  GPA
                </span>
                <span className="font-semibold text-white">{academicDetails.gpa || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
              <div>
                <span className="block text-3xs uppercase font-bold text-gray-500 tracking-wider">
                  Graduation Year
                </span>
                <span className="font-semibold text-white">
                  {academicDetails.graduationYear || 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
              <div>
                <span className="block text-3xs uppercase font-bold text-gray-500 tracking-wider">
                  Location
                </span>
                <span className="font-semibold text-white">
                  {academicDetails.location || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. ROW 2: METRICS & AI MATCH INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="candidate-skills-section">
        {/* Left Skills & Competencies Card (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#111516] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Code2 className="h-4 w-4 text-[#00E5D4]" />
                <span>Candidate Verified Skills</span>
              </div>
              <span className="text-3xs text-gray-400 font-medium">
                {skills?.length || 0} Skills Assessed
              </span>
            </div>

            {skills && skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-[#15191a]/80 border border-white/[0.06] p-2.5 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getSkillIcon(skill.name)}
                      <span className="text-xs font-bold text-white truncate">{skill.name}</span>
                    </div>
                    <VerificationBadge
                      status={skill.status}
                      variant="outline"
                      className="scale-90 shrink-0"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-gray-500 font-medium">
                No verified skills recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right AI Match Insights (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#111516] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-[#00E5D4]" />
                <span>AI Match Insights</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-3xs font-extrabold text-emerald-400">
                {aiExplanation?.score !== undefined && (
                  <>
                    <span>{aiExplanation.score}%</span>
                    <span className="mx-1">•</span>
                  </>
                )}
                {aiExplanation?.fitLabel || 'High Fit'}
              </span>
            </div>

            <p className="mt-3 text-xs text-gray-300 leading-relaxed">
              {aiExplanation?.summary ||
                'Top tier alignment for senior frontend and fullstack roles with exceptional system design abilities. Demonstrates strong problem solving, architectural thinking and consistent project impact.'}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-white/[0.04]">
            {(
              aiExplanation?.insightTags || [
                'Technical Fit',
                'Leadership Potential',
                'Growth Mindset',
              ]
            ).map((insight, idx) => (
              <span
                key={idx}
                className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-3xs font-medium text-gray-300"
              >
                {insight}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. ROW 3: VERIFIED COMPETENCIES & COGNITIVE/COMMUNICATION PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Verified Competencies (6 Cols) */}
        <div className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-[#111516] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#00E5D4]" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Verified Competencies
                  </h3>
                  <span className="text-3xs text-gray-400 block">
                    Skills verified through assessments and projects
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onViewAllCompetencies) {
                    onViewAllCompetencies();
                  } else {
                    document
                      .getElementById('candidate-skills-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-3xs font-semibold text-[#00E5D4] hover:underline"
              >
                View All
              </button>
            </div>

            {skills && skills.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {skills.map((skill, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-[#15191a] border border-white/[0.06] p-3 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      {getSkillIcon(skill.name)}
                      <span className="text-xs font-bold text-white">{skill.name}</span>
                    </div>
                    <VerificationBadge
                      status={skill.status}
                      variant="outline"
                      className="scale-90"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cognitive & Communication Profile (6 Cols) */}
        <div className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-[#111516] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Cognitive & Communication Profile
                  </h3>
                  <span className="text-3xs text-gray-400 block">
                    Evaluation based on assessment performance and interview analysis
                  </span>
                </div>
              </div>
            </div>

            {cognitiveCommSummary && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cognitive Strengths Card */}
                <div className="rounded-lg bg-[#15191a] border border-white/[0.06] p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Brain className="h-3.5 w-3.5 text-purple-400" />
                        <span>Cognitive Strengths</span>
                      </div>
                      {cognitiveCommSummary.cognitiveScore !== undefined && (
                        <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-mono text-3xs font-bold text-purple-300 border border-purple-500/20">
                          {cognitiveCommSummary.cognitiveScore}%
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(
                        cognitiveCommSummary.cognitiveStrengths || [
                          'System Architecture',
                          'Async Execution Modeling',
                          'Algorithmic Efficiency',
                        ]
                      ).map((strength, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-3xs font-medium text-purple-300"
                        >
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Communication & Defense Card */}
                <div className="rounded-lg bg-[#15191a] border border-white/[0.06] p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                        <span>Communication & Defense</span>
                      </div>
                      {cognitiveCommSummary.communicationScore !== undefined && (
                        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-3xs font-bold text-blue-300 border border-blue-500/20">
                          {cognitiveCommSummary.communicationScore}%
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                      {cognitiveCommSummary.communicationSummary ||
                        'Articulates complex architectural trade-offs with exceptional conciseness, structured logic, and evidence-backed reasoning.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cognitiveCommSummary?.overallNotes && (
            <p className="mt-3 text-3xs italic text-gray-400 border-t border-white/[0.04] pt-2">
              {cognitiveCommSummary.overallNotes}
            </p>
          )}
        </div>
      </div>

      {/* 4. ROW 4: VERIFIED PROJECTS */}
      {projects && projects.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#111516] p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#00E5D4]" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Verified Projects
                </h3>
                <span className="text-3xs text-gray-400 block">
                  Real projects. Real skills. Verified by assessments.
                </span>
              </div>
            </div>
            <button type="button" className="text-3xs font-semibold text-[#00E5D4] hover:underline">
              View All Projects
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {projects.map((project, index) => {
              const embedUrl = getLoomEmbedUrl(project.loomUrl);
              return (
                <div
                  key={index}
                  className="rounded-lg border border-white/[0.06] bg-[#15191a] p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
                >
                  {/* Left Project Loom Video Preview */}
                  <div className="lg:col-span-4">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-white/10 group">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={`Project video: ${project.title}`}
                          className="absolute inset-0 h-full w-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/40 text-gray-400">
                          <MonitorPlay className="h-10 w-10 opacity-50" />
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 bg-black/80 font-mono text-3xs font-semibold text-white px-2 py-0.5 rounded border border-white/10 pointer-events-none">
                        {project.duration || '12:34'}
                      </span>
                    </div>
                  </div>

                  {/* Middle Project Details */}
                  <div className="lg:col-span-5 flex flex-col justify-between h-full">
                    <div>
                      <h4 className="font-heading text-base font-bold text-white">
                        {project.title}
                      </h4>
                      <p className="mt-1 text-xs text-gray-300 leading-relaxed">
                        {project.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {project.stack.map((tech) => (
                          <span
                            key={tech}
                            className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-3xs font-mono text-gray-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs font-semibold">
                      {project.loomUrl && (
                        <a
                          href={project.loomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[#00E5D4] hover:underline"
                        >
                          <MonitorPlay className="h-3.5 w-3.5" />
                          <span>Watch Loom Preview</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-gray-400 hover:text-white hover:underline"
                        >
                          <GithubIcon className="h-3.5 w-3.5" />
                          <span>Repository</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right Metadata Column */}
                  <div className="lg:col-span-3 lg:border-l lg:border-white/[0.06] lg:pl-5 flex flex-col justify-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Verified Project</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="h-4 w-4 text-gray-500 shrink-0" />
                      <span>
                        {project.isTeamProject !== false ? 'Team Project' : 'Solo Project'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                      <span>{project.dateRange || 'Jan 2025 - Apr 2025'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons (if provided) */}
      {actions && (
        <div className="mt-5 flex justify-end gap-2 border-t border-white/[0.08] pt-4">
          {actions}
        </div>
      )}
    </div>
  );
}
