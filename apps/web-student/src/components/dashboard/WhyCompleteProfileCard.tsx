'use client';

import { Briefcase, ShieldCheck, Sparkles, Target } from 'lucide-react';

const BENEFITS = [
  {
    icon: ShieldCheck,

    title: 'Unlock skill verification',

    description: 'Get your skills verified with evidence.',
  },

  {
    icon: Target,

    title: 'Increase discoverability',

    description: 'Be visible to top employers.',
  },

  {
    icon: Sparkles,

    title: 'Showcase your potential',

    description: 'Build a strong, credible profile.',
  },

  {
    icon: Briefcase,

    title: 'Access better opportunities',

    description: 'Get matched with relevant jobs and internships.',
  },
] as const;

export function WhyCompleteProfileCard() {
  return (
    <section
      aria-labelledby="why-complete-heading"

      className="h-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6"
    >
      <h2 id="why-complete-heading" className="text-lg font-semibold text-[var(--ds-text)]">
        Why complete your profile?
      </h2>

      <ul className="mt-5 space-y-4">
        {BENEFITS.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ds-green-soft)]">
                <Icon className="h-4 w-4 text-[var(--ds-green)]" aria-hidden="true" />
              </span>

              <div>
                <p className="text-sm font-semibold text-[var(--ds-text)]">{item.title}</p>

                <p className="mt-0.5 text-sm leading-relaxed text-[var(--ds-text-muted)]">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
