import type { HTMLAttributes, ReactNode } from 'react';
import type { Tier } from '@smart/contracts';
import { Mail, Phone, ExternalLink, MonitorPlay } from 'lucide-react';
import { cn } from '../lib/cn';
import { TierBadge } from './badge';
import { VerificationBadge } from './verification-badge';
import { AiExplanationPanel } from './ai-explanation-panel';

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

export interface CandidateSkill {
  name: string;
  status:
    | 'DECLARED'
    | 'IN_PROGRESS'
    | 'PENDING_REVIEW'
    | 'LOCKED'
    | 'VERIFIED'
    | 'EXPIRING'
    | 'EXPIRING_SOON'
    | 'BEGINNER_REATTEMPT'
    | string;
}

export interface CandidateProject {
  title: string;
  description: string;
  stack: string[];
  loomUrl?: string;
  githubUrl?: string;
}

export interface CandidateProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  candidateId: string;
  displayName: string;
  trackName: string;
  headlineTier: Tier;
  skills: CandidateSkill[];

  contactInfo?: {
    email?: string;
    phone?: string;
    linkedIn?: string;
  };

  academicDetails?: {
    gpa?: string;
    graduationYear?: number;
    batchName?: string;
  };

  aiExplanation?: {
    summary: string;
    score?: number; // MatchScore (0 - 100)
    tone?: 'brand' | 'info' | 'warning' | 'success' | 'danger';
  };

  projects?: CandidateProject[];

  actions?: ReactNode;
}

export function CandidateProfileCard({
  candidateId: _candidateId,
  displayName,
  trackName,
  headlineTier,
  skills,
  contactInfo,
  academicDetails,
  aiExplanation,
  projects,
  actions,
  className,
  ...props
}: CandidateProfileCardProps) {
  return (
    <div
      className={cn(
        'w-full rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-6 shadow-[var(--shadow-card)] transition-all',
        className,
      )}
      role="article"
      aria-label={`Candidate Profile: ${displayName}`}
      {...props}
    >
      {/* Header section: avatar details, track name, tier badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-900 border border-brand-500/30 text-brand-300 font-heading text-lg font-bold">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-heading text-base font-extrabold text-[var(--text-primary)]">
              {displayName}
            </h3>
            <span className="block text-xs text-[var(--text-muted)] font-medium">{trackName}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TierBadge tier={headlineTier} showLabel={false} />
        </div>
      </div>

      {/* Conditionally rendered academic details */}
      {academicDetails && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--surface-border)] pt-4 text-xs">
          <div>
            <span className="block text-[var(--text-muted)] font-medium">Batch</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {academicDetails.batchName || 'N/A'}
            </span>
          </div>
          <div>
            <span className="block text-[var(--text-muted)] font-medium">GPA</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {academicDetails.gpa || 'N/A'}
            </span>
          </div>
          <div>
            <span className="block text-[var(--text-muted)] font-medium">Grad Year</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {academicDetails.graduationYear || 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Conditionally rendered contact information */}
      {contactInfo && (
        <div className="mt-4 flex flex-wrap gap-4 border-t border-[var(--surface-border)] pt-4 text-xs text-[var(--text-muted)]">
          {contactInfo.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              <a
                href={`mailto:${contactInfo.email}`}
                className="hover:text-[var(--accent)] hover:underline"
              >
                {contactInfo.email}
              </a>
            </span>
          )}
          {contactInfo.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{contactInfo.phone}</span>
            </span>
          )}
          {contactInfo.linkedIn && (
            <span className="flex items-center gap-1.5">
              <LinkedinIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <a
                href={contactInfo.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-[var(--accent)] hover:underline"
              >
                LinkedIn <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </span>
          )}
        </div>
      )}

      {/* Skills Inventory */}
      {skills && skills.length > 0 && (
        <div className="mt-4 border-t border-[var(--surface-border)] pt-4">
          <span className="block text-2xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Verified Competencies
          </span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md bg-[var(--surface)] border border-[var(--surface-border)] px-2.5 py-1"
              >
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {skill.name}
                </span>
                <VerificationBadge status={skill.status} variant="outline" className="scale-90" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Explanation / Match Insights */}
      {aiExplanation && (
        <div className="mt-4">
          <AiExplanationPanel
            explanation={aiExplanation.summary}
            score={aiExplanation.score}
            tone={aiExplanation.tone}
          />
        </div>
      )}

      {/* Verified Projects */}
      {projects && projects.length > 0 && (
        <div className="mt-4 border-t border-[var(--surface-border)] pt-4">
          <span className="block text-2xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Verified Projects
          </span>
          <div className="mt-3 space-y-3">
            {projects.map((project, index) => (
              <div
                key={index}
                className="rounded-md border border-[var(--surface-border)] bg-[var(--surface)] p-3"
              >
                <h4 className="font-heading text-sm font-extrabold text-[var(--text-primary)]">
                  {project.title}
                </h4>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                  {project.description}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-[4px] bg-[var(--surface-muted)] border border-[var(--surface-border)] px-1.5 py-0.5 text-3xs font-mono text-[var(--text-primary)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                {(project.loomUrl || project.githubUrl) && (
                  <div className="mt-3 flex items-center gap-3 text-2xs font-semibold">
                    {project.loomUrl && (
                      <a
                        href={project.loomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[var(--accent)] hover:underline"
                      >
                        <MonitorPlay className="h-3.5 w-3.5" />
                        Watch Loom Preview
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline"
                      >
                        <GithubIcon className="h-3.5 w-3.5" />
                        Repository
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions container */}
      {actions && (
        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--surface-border)] pt-4">
          {actions}
        </div>
      )}
    </div>
  );
}
