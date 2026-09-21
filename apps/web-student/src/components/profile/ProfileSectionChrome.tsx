'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  studentBentoTipIconWrapClass,
  studentEmptyIconWrapClass,
  studentWarningBannerClass,
} from '@/lib/student-ui-classes';

export function ProfileSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3 pb-1 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="min-w-0 flex-1 max-w-2xl">
        <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[var(--ds-text)]">
          {title}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed tracking-[-0.01em] text-[var(--ds-text-muted)]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0 lg:pt-0.5">{action}</div> : null}
    </div>
  );
}

export function ProfileSectionError({ children }: { children: ReactNode }) {
  return <div className={studentWarningBannerClass}>{children}</div>;
}

export function ProfileBentoEmptyPanel({
  tipIcon: TipIcon,
  tipIconClassName,
  tipTitle,
  tipBody,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyBody,
  actions,
}: {
  tipIcon: LucideIcon;
  tipIconClassName: string;
  tipTitle: string;
  tipBody: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyBody: string;
  actions: ReactNode;
}) {
  return (
    <div className="w-full overflow-hidden rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[var(--ds-border-subtle)]/80 bg-[var(--student-blue-soft)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className={`${studentBentoTipIconWrapClass} ${tipIconClassName}`}>
            <TipIcon className="size-5" strokeWidth={1.5} aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ds-text)]">
              {tipTitle}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ds-text-muted)]">
              {tipBody}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className={studentEmptyIconWrapClass}>
          <EmptyIcon className="size-7" strokeWidth={1.25} aria-hidden />
        </span>
        <p className="mt-4 text-[15px] font-semibold tracking-[-0.02em] text-[var(--ds-text)]">
          {emptyTitle}
        </p>
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--ds-text-muted)]">
          {emptyBody}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">{actions}</div>
      </div>
    </div>
  );
}
