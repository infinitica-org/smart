'use client';

import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';
import { VerificationBadge } from '@smart/ui';
import { PageHeader, Surface } from '@/components/dashboard/ConsoleChrome';
import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';
import { DEFAULT_PROFILE, SKILL_CHIPS, skillStatusToBadge } from '@/lib/candidate-dashboard-data';

/** Lightweight profile shell for nav continuity; skills declare is CN-T04. */
export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 pb-12">
      <PageHeader
        title="My Profile"
        subtitle="Profile strength and skill verification snapshot for the candidate console."
      />

      <Surface className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00fad0]/15 text-[#00fad0]">
          <User className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-medium text-white">
            {DEFAULT_PROFILE.firstName} {DEFAULT_PROFILE.lastName}
          </h2>
          <p className="text-sm text-white/45">{DEFAULT_PROFILE.headline}</p>
          <div className="mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#00fad0]"
              style={{ width: `${DEFAULT_PROFILE.completionPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[#00fad0]">
            {DEFAULT_PROFILE.completionPercent}% complete
          </p>
        </div>
        <Link
          href="/public-profile"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white"
        >
          Public preview
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Surface>

      <Surface>
        <h2 className="mb-4 text-lg font-medium text-white">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {SKILL_CHIPS.map((skill) => (
            <span
              key={skill.name}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white"
            >
              {skill.name}
              <VerificationBadge
                status={skillStatusToBadge(skill.status)}
                variant="outline"
                className="scale-90"
              />
              {skill.lockedUntil ? (
                <span className="text-white/40">until {skill.lockedUntil}</span>
              ) : null}
            </span>
          ))}
        </div>
        <p className="mt-6 text-xs text-white/40">
          Full taxonomy picker and declare flow live on the CN-T04 skills section when merged.
        </p>
      </Surface>

      <Surface>
        <ProjectSubmissionForm />
      </Surface>
    </div>
  );
}
