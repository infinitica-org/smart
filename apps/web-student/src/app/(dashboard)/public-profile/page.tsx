'use client';

import { useState } from 'react';
import { TierBadge, useQuery } from '@smart/ui';
import {
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  FolderGit2,
  GitBranch,
  GraduationCap,
  Link2,
  Loader2,
  Share2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CandidateAvatar } from '@/components/profile/CandidateAvatar';
import { VisibilitySettingsCard } from '@/components/public-profile/visibility-settings-card';

const VERIFICATION_METHOD_LABELS: Record<string, string> = {
  ENDORSEMENT: 'Endorsed',
  LLM: 'AI-verified',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  INTERNSHIP: 'Internship',
  CONTRACT: 'Contract',
};

function formatDate(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function PublicProfilePreviewPage() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const { data: profile } = useQuery({
    queryKey: ['me', 'public-profile'] as const,
    queryFn: () => api.users.getMyPublicProfile(),
  });
  const { data: link } = useQuery({
    queryKey: ['me', 'public-profile-link'] as const,
    queryFn: () => api.users.getPublicProfileLink(),
  });

  const trackLabel = profile
    ? [profile.trackCategory === 'MBA' ? 'MBA' : null, profile.trackName]
        .filter(Boolean)
        .join(' · ')
    : '';
  const headline = trackLabel ? `${trackLabel} candidate` : 'SMART candidate';

  const copyLink = async () => {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const shareLink = async () => {
    if (!link?.url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.fullName ?? 'SMART candidate'}'s profile`,
          url: link.url,
        });
        return;
      } catch {
        // User dismissed the native share sheet — fall through to copy.
      }
    }
    void copyLink();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-none bg-transparent px-8 py-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 font-display text-2xl font-medium text-gray-900 dark:text-white">
              Public Profile Preview
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium tracking-wide text-gray-600 dark:bg-white/10 dark:text-gray-300">
                View Only
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This is exactly what an employer sees at your public link — no login required.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void copyLink()}
              disabled={!link?.url}
              className="flex items-center gap-2 rounded-full bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
            >
              <Link2 className="h-4 w-4" />
              {copyState === 'copied'
                ? 'Copied!'
                : copyState === 'error'
                  ? 'Copy failed'
                  : 'Copy Link'}
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              disabled={!link?.url}
              className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm hover:bg-foreground/90 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              Share Profile
            </button>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-gray-50/50 p-4 dark:bg-transparent md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <VisibilitySettingsCard />
          {!profile ? (
            <div className="flex items-center justify-center gap-2 rounded-[40px] border border-gray-100 bg-white py-24 text-sm text-gray-400 dark:border-white/5 dark:bg-[#1c1c1e]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…
            </div>
          ) : (
            <div className="overflow-hidden rounded-[40px] border border-gray-100 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:border-white/5 dark:bg-[#1c1c1e] dark:shadow-[0_12px_40px_rgb(0,0,0,0.15)]">
              <div className="relative h-32 bg-muted">
                <div className="absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-white p-1.5 dark:bg-[#161616]">
                  <CandidateAvatar
                    fullName={profile.fullName}
                    profilePhotoUrl={profile.profilePhotoUrl}
                    className="h-full w-full text-2xl font-bold"
                    fallbackClassName="rounded-full bg-muted text-2xl font-bold text-gray-500 dark:bg-muted dark:text-gray-400"
                  />
                </div>
              </div>

              <div className="px-8 pb-8 pt-16">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.fullName}
                    </h1>
                    <p className="mt-1 font-medium text-gray-600 dark:text-gray-400">{headline}</p>
                    {profile.lastUpdatedAt ? (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>Last updated {formatDate(profile.lastUpdatedAt)}</span>
                      </div>
                    ) : null}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {profile.acceptsEmployerMessages
                        ? 'Open to employer messages'
                        : 'Not accepting employer messages'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.certificate ? (
                      <TierBadge tier={profile.certificate.tier} showLabel />
                    ) : null}
                    {profile.skills.length > 0 ? (
                      <div className="flex items-center gap-1.5 rounded-full border border-foreground/30 bg-foreground/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground dark:text-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        SMART Verified
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Verified Skills */}
                <div className="mt-10">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Code2 className="h-4 w-4 text-gray-500" />
                    Verified Skills
                    <span className="font-normal text-gray-400 dark:text-gray-500">
                      ({profile.skills.length} of {profile.declaredSkillsCount} declared)
                    </span>
                  </h3>
                  {profile.hiddenSections?.includes('skills') ? (
                    <p className="text-sm italic text-gray-400 dark:text-gray-500">
                      Hidden by your section privacy settings.
                    </p>
                  ) : profile.skills.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No verified skills yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <div
                          key={skill.skillCode}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {skill.skillName}
                          </span>
                          <div className="h-3 w-px bg-gray-300 dark:bg-white/20" />
                          <span className="text-xs font-bold text-foreground dark:text-foreground">
                            {skill.proficiency.charAt(0) + skill.proficiency.slice(1).toLowerCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work Experience */}
                <div className="mt-10 border-t border-gray-100 pt-10 dark:border-white/5">
                  <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    Work Experience
                  </h3>
                  {profile.hiddenSections?.includes('workExperience') ? (
                    <p className="text-sm italic text-gray-400 dark:text-gray-500">
                      Hidden by your section privacy settings.
                    </p>
                  ) : profile.workExperience.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No employer-verified work experience yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {profile.workExperience.map((entry, idx) => (
                        <div
                          key={`${entry.companyName}-${String(idx)}`}
                          className="flex items-start gap-3 rounded-[20px] border border-gray-100 bg-gray-50/50 p-5 dark:border-white/5 dark:bg-white/[0.02]"
                        >
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {entry.role} · {entry.companyName}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {EMPLOYMENT_TYPE_LABELS[entry.employmentType] ?? entry.employmentType}
                              {' · '}
                              {formatDate(entry.startDate)} –{' '}
                              {entry.isCurrent
                                ? 'Present'
                                : entry.endDate
                                  ? formatDate(entry.endDate)
                                  : '—'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Education */}
                <div className="mt-10 border-t border-gray-100 pt-10 dark:border-white/5">
                  <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <GraduationCap className="h-4 w-4 text-gray-500" />
                    Education
                  </h3>
                  {profile.hiddenSections?.includes('education') ? (
                    <p className="text-sm italic text-gray-400 dark:text-gray-500">
                      Hidden by your section privacy settings.
                    </p>
                  ) : profile.education.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No verified education entries yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {profile.education.map((entry, idx) => (
                        <div
                          key={`${entry.institutionName}-${String(idx)}`}
                          className="flex items-start gap-3 rounded-[20px] border border-gray-100 bg-gray-50/50 p-5 dark:border-white/5 dark:bg-white/[0.02]"
                        >
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {entry.degree} {entry.fieldOfStudy ? `in ${entry.fieldOfStudy}` : ''}
                            </p>
                            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                              {entry.institutionName}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(entry.startDate)} –{' '}
                              {entry.current
                                ? 'Present'
                                : entry.endDate
                                  ? formatDate(entry.endDate)
                                  : '—'}
                              {entry.grade ? ` · Grade: ${entry.grade}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects */}
                <div className="mt-10 border-t border-gray-100 pt-10 dark:border-white/5">
                  <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <FolderGit2 className="h-4 w-4 text-gray-500" />
                    Projects
                  </h3>
                  {profile.hiddenSections?.includes('projects') ? (
                    <p className="text-sm italic text-gray-400 dark:text-gray-500">
                      Hidden by your section privacy settings.
                    </p>
                  ) : profile.projects.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No projects submitted yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {profile.projects.map((project) => (
                        <div
                          key={project.projectId}
                          className="rounded-[24px] border border-gray-100 bg-gray-50/50 p-6 dark:border-white/5 dark:bg-white/[0.02]"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {project.title}
                            </h4>
                            {project.status === 'VERIFIED' ? (
                              <span className="flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-bold text-foreground dark:text-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {project.score !== null
                                  ? `Verified · ${String(Math.round(project.score))}/100`
                                  : 'Verified'}
                              </span>
                            ) : null}
                            <div className="ml-auto flex items-center gap-2">
                              {project.githubUrl ? (
                                <a
                                  href={project.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-white"
                                  aria-label="GitHub repository"
                                >
                                  <GitBranch className="h-4 w-4" />
                                </a>
                              ) : null}
                              {project.liveUrl ? (
                                <a
                                  href={project.liveUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-white"
                                  aria-label="Live demo"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                          <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                            {project.outcome}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {project.stack
                              .split(',')
                              .map((tech) => tech.trim())
                              .filter(Boolean)
                              .map((tech) => (
                                <span
                                  key={tech}
                                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 dark:border-white/5 dark:bg-black/40 dark:text-gray-400"
                                >
                                  {tech}
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Certifications */}
                <div className="mt-10 border-t border-gray-100 pt-10 dark:border-white/5">
                  <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Award className="h-4 w-4 text-gray-500" />
                    Certifications
                  </h3>
                  {profile.hiddenSections?.includes('certifications') ? (
                    <p className="text-sm italic text-gray-400 dark:text-gray-500">
                      Hidden by your section privacy settings.
                    </p>
                  ) : profile.externalCertificates.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No verified certifications yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {profile.externalCertificates.map((cert, idx) => (
                        <div
                          key={`${cert.title}-${String(idx)}`}
                          className="rounded-[20px] border border-gray-100 bg-gray-50/50 p-5 dark:border-white/5 dark:bg-white/[0.02]"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {cert.title}
                            </p>
                            {cert.verificationMethod ? (
                              <span className="flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-bold text-foreground dark:text-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {VERIFICATION_METHOD_LABELS[cert.verificationMethod] ??
                                  cert.verificationMethod}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {cert.issuer}
                          </p>
                          {cert.skills.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {cert.skills.map((skill) => (
                                <div
                                  key={skill.skillName}
                                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-white/5"
                                >
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {skill.skillName}
                                  </span>
                                  <div className="h-3 w-px bg-gray-300 dark:bg-white/20" />
                                  <span className="text-xs font-bold text-foreground dark:text-foreground">
                                    {skill.proficiency.charAt(0) +
                                      skill.proficiency.slice(1).toLowerCase()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
