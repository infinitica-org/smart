'use client';

import { use, useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { TierBadge } from '@smart/ui';
import type { PublicCandidateProfileDto } from '@smart/contracts';
import { api } from '@/lib/api';

/** web-verify has no icon library dependency — small inline SVGs match its existing pages. */
function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}
const ICON_PATH = {
  checkCircle: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  code: 'M10 20l4-16M6 8l-4 4 4 4M18 8l4 4-4 4',
  briefcase:
    'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-4 6a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2H4a2 2 0 00-2 2v4z',
  folderGit: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  link: 'M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5',
  externalLink: 'M14 5h5m0 0v5m0-5L10 14M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-5',
  award: 'M12 15a5 5 0 100-10 5 5 0 000 10zm-3.5 3.5L7 22l5-3 5 3-1.5-3.5M8.5 18.5L12 15l3.5 3.5',
  spinner:
    'M12 4V2m0 20v-2m8-8h2M2 12h2m14.14 6.14l1.42 1.42M4.44 4.44l1.42 1.42m0 12.28l-1.42 1.42M19.56 4.44l-1.42 1.42',
  searchX: 'M21 21l-4.35-4.35M10 17a7 7 0 100-14 7 7 0 000 14zM8 8l4 4m0-4l-4 4',
};

const VERIFICATION_METHOD_LABELS: Record<string, string> = {
  ENDORSEMENT: 'Endorsed',
  LLM: 'AI-verified',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  FREELANCE: 'Freelance',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || '—';
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicCandidateProfilePage({ params }: PageProps) {
  const { slug } = use(params);
  const [profile, setProfile] = useState<PublicCandidateProfileDto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public
      .getCandidateProfile(slug)
      .then((res) => {
        if (!cancelled) setProfile(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isSmartApiError(err) && err.statusCode === 404) {
          setNotFound(true);
        } else {
          setError('Could not load this profile right now.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-24 text-center">
        <Icon path={ICON_PATH.searchX} className="h-10 w-10 text-[var(--text-muted)]" />
        <h1 className="text-lg font-semibold">No profile at this link</h1>
        <p className="text-sm text-[var(--text-muted)]">
          This share link doesn&apos;t match a SMART candidate profile. Double-check the link with
          whoever sent it to you.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center text-sm text-[var(--text-muted)]">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[var(--text-muted)]">
        <Icon path={ICON_PATH.spinner} className="h-4 w-4 animate-spin" /> Loading profile…
      </div>
    );
  }

  const trackLabel = [profile.trackCategory === 'MBA' ? 'MBA' : null, profile.trackName]
    .filter(Boolean)
    .join(' · ');
  const headline = trackLabel ? `${trackLabel} candidate` : 'SMART candidate';

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="overflow-hidden rounded-[40px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <div className="relative h-32 bg-gradient-to-r from-[#00fad0]/20 to-[#004c63]/30">
          <div className="absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-[var(--surface)] p-1.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[var(--surface-muted)] to-[var(--surface-border)] text-2xl font-bold text-[var(--text-muted)]">
              {initialsOf(profile.fullName)}
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-16">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{profile.fullName}</h1>
              <p className="mt-1 font-medium text-[var(--text-muted)]">{headline}</p>
            </div>
            <div className="flex items-center gap-2">
              {profile.certificate ? <TierBadge tier={profile.certificate.tier} showLabel /> : null}
              {profile.skills.length > 0 ? (
                <div className="flex items-center gap-1.5 rounded-full border border-[#00fad0]/30 bg-[#00fad0]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#00967c] dark:text-[#00fad0]">
                  <Icon path={ICON_PATH.checkCircle} className="h-4 w-4" />
                  SMART Verified
                </div>
              ) : null}
            </div>
          </div>

          {/* Verified Skills */}
          <div className="mt-10">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Icon path={ICON_PATH.code} className="h-4 w-4 text-[var(--text-muted)]" />
              Verified Skills
            </h3>
            {profile.skills.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No verified skills yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <div
                    key={skill.skillCode}
                    className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5"
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {skill.skillName}
                    </span>
                    <div className="h-3 w-px bg-[var(--surface-border)]" />
                    <span className="text-xs font-bold text-[#00967c] dark:text-[#00fad0]">
                      {skill.proficiency.charAt(0) + skill.proficiency.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Work Experience */}
          <div className="mt-10 border-t border-[var(--surface-border)] pt-10">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Icon path={ICON_PATH.briefcase} className="h-4 w-4 text-[var(--text-muted)]" />
              Work Experience
            </h3>
            {profile.workExperience.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No employer-verified work experience yet.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {profile.workExperience.map((entry, idx) => (
                  <div
                    key={`${entry.companyName}-${String(idx)}`}
                    className="flex items-start gap-3 rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00fad0]/10 text-[#00967c] dark:text-[#00fad0]">
                      <Icon path={ICON_PATH.checkCircle} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--text-primary)]">
                        {entry.role} · {entry.companyName}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
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

          {/* Projects */}
          <div className="mt-10 border-t border-[var(--surface-border)] pt-10">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Icon path={ICON_PATH.folderGit} className="h-4 w-4 text-[var(--text-muted)]" />
              Projects
            </h3>
            {profile.projects.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No projects submitted yet.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {profile.projects.map((project) => (
                  <div
                    key={project.projectId}
                    className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-6"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                        {project.title}
                      </h4>
                      {project.status === 'VERIFIED' ? (
                        <span className="flex items-center gap-1 rounded-full bg-[#00fad0]/10 px-2 py-0.5 text-xs font-bold text-[#00967c] dark:text-[#00fad0]">
                          <Icon path={ICON_PATH.checkCircle} className="h-3.5 w-3.5" />
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
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            aria-label="GitHub repository"
                          >
                            <Icon path={ICON_PATH.link} className="h-4 w-4" />
                          </a>
                        ) : null}
                        {project.liveUrl ? (
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            aria-label="Live demo"
                          >
                            <Icon path={ICON_PATH.externalLink} className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <p className="line-clamp-3 text-sm text-[var(--text-muted)]">
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
                            className="rounded-md border border-[var(--surface-border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-muted)]"
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

          {/* External Certifications */}
          <div className="mt-10 border-t border-[var(--surface-border)] pt-10">
            <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Icon path={ICON_PATH.award} className="h-4 w-4 text-[var(--text-muted)]" />
              Certifications
            </h3>
            {profile.externalCertificates.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No verified certifications yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {profile.externalCertificates.map((cert, idx) => (
                  <div
                    key={`${cert.title}-${String(idx)}`}
                    className="rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--text-primary)]">{cert.title}</p>
                      {cert.verificationMethod ? (
                        <span className="flex items-center gap-1 rounded-full bg-[#00fad0]/10 px-2 py-0.5 text-xs font-bold text-[#00967c] dark:text-[#00fad0]">
                          <Icon path={ICON_PATH.checkCircle} className="h-3.5 w-3.5" />
                          {VERIFICATION_METHOD_LABELS[cert.verificationMethod] ??
                            cert.verificationMethod}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{cert.issuer}</p>
                    {cert.skills.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {cert.skills.map((skill) => (
                          <div
                            key={skill.skillName}
                            className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5"
                          >
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {skill.skillName}
                            </span>
                            <div className="h-3 w-px bg-[var(--surface-border)]" />
                            <span className="text-xs font-bold text-[#00967c] dark:text-[#00fad0]">
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
    </div>
  );
}
