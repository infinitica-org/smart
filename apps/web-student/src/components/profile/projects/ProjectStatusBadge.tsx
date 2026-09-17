'use client';

import type { ProjectDto } from '@smart/contracts';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { processingStateCopy } from '@/lib/project-submission';

const TONE_CLASS: Record<'info' | 'success' | 'warning' | 'danger', string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
};

export function ProjectStatusBadge({ project }: { project: ProjectDto }) {
  const copy = processingStateCopy(project);
  const tone =
    project.status === 'REJECTED'
      ? ('danger' as const)
      : copy.tone === 'warning'
        ? 'warning'
        : copy.tone;

  const Icon =
    project.status === 'VERIFIED'
      ? CheckCircle2
      : project.status === 'SUBMITTED'
        ? Loader2
        : project.status === 'REJECTED'
          ? AlertCircle
          : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      <Icon
        className={`h-3 w-3 shrink-0 ${project.status === 'SUBMITTED' ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      {copy.title}
    </span>
  );
}
