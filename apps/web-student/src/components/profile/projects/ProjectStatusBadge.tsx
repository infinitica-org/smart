'use client';

import type { ProjectDto } from '@smart/contracts';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { processingStateCopy } from '@/lib/project-submission';
import {
  studentBadgeErrorClass,
  studentBadgeInProgressClass,
  studentBadgePendingClass,
  studentBadgeVerifiedClass,
} from '@/lib/student-ui-classes';

const TONE_CLASS: Record<'info' | 'success' | 'warning' | 'danger', string> = {
  info: studentBadgeInProgressClass,
  success: studentBadgeVerifiedClass,
  warning: studentBadgePendingClass,
  danger: studentBadgeErrorClass,
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
