'use client';

import Link from 'next/link';
import type { ProjectDto } from '@smart/contracts';
import { Alert } from '@smart/ui';
import { Mic } from 'lucide-react';

export function projectDefenseInterviewHref(projectId: string): string {
  return `/profile/projects/${projectId}/defense`;
}

export function ProjectDefenseInterviewDialog({ project }: { project: ProjectDto }) {
  if (project.interviewStatus === 'COMPLETED') {
    return (
      <Alert tone="success" title="Ownership interview complete">
        You have already completed the voice interview for this project.
      </Alert>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#00fad0]/20 bg-gradient-to-br from-[#00fad0]/8 via-card to-[#004c63]/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00fad0]/15 text-[#00967c]">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ownership interview required</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Automated checks finished. Complete a short voice interview to verify you built this
              project.
            </p>
          </div>
        </div>
        <Link
          href={projectDefenseInterviewHref(project.projectId)}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-[#131313] transition hover:bg-[#33ffdd]"
        >
          Start interview
        </Link>
      </div>
    </div>
  );
}
