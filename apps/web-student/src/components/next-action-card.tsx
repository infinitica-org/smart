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
      className="rounded-[28px] border border-[#00fad0]/20 bg-gradient-to-br from-[#004c63]/40 to-[#141414] p-6 md:p-7"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00fad0]">
        Recommended next step
      </p>
      <h3 className="mt-2 text-xl font-medium text-white">{action.title}</h3>
      <p className="mt-2 max-w-2xl text-sm text-white/60">{action.description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={action.href}
          className="inline-flex items-center justify-center rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-[#131313] transition hover:bg-[#7dffe6]"
        >
          {action.ctaLabel}
        </Link>
        <button
          type="button"
          onClick={onLater}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white"
        >
          Later
        </button>
      </div>
    </section>
  );
}
