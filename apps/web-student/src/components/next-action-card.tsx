'use client';

import Link from 'next/link';
import type { RecommendedAction } from '@/lib/profile-progress';

export interface NextActionCardProps {
  action: RecommendedAction;
  onLater: () => void;
}

export function NextActionCard({ action, onLater }: NextActionCardProps) {
  return (
    <section
      aria-label="Recommended next step"
      className="rounded-[28px] border border-[#00fad0]/25 bg-gradient-to-br from-[#00fad0]/10 via-card to-[#004c63]/5 p-6 shadow-sm md:p-7"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00967c]">
        Recommended next step
      </p>
      <h3 className="mt-2 text-xl font-medium text-foreground">{action.title}</h3>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{action.description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={action.href}
          className="inline-flex items-center justify-center rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-[#131313] transition hover:bg-[#33ffdd]"
        >
          {action.ctaLabel}
        </Link>
        <button
          type="button"
          onClick={onLater}
          className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground"
        >
          Later
        </button>
      </div>
    </section>
  );
}
