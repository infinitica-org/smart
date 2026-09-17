'use client';

import { BarChart3, Shield, Star, Users } from 'lucide-react';

import {
  profileCardClass,
  profileHeadingClass,
  profileSecondaryTextClass,
} from '@/lib/profile-ui-classes';

const REASONS = [
  {
    icon: Shield,
    title: 'Unlock skill verification',
    description: 'Get your skills verified with evidence.',
  },
  {
    icon: BarChart3,
    title: 'Increase discoverability',
    description: 'Be visible to top employers.',
  },
  {
    icon: Star,
    title: 'Showcase your potential',
    description: 'Build a strong, credible profile.',
  },
  {
    icon: Users,
    title: 'Access better opportunities',
    description: 'Get matched with relevant jobs and internships.',
  },
] as const;

export function ProfileWhyCompleteCard() {
  return (
    <section aria-labelledby="why-complete-heading" className={profileCardClass}>
      <h2 id="why-complete-heading" className={`text-base font-semibold ${profileHeadingClass}`}>
        Why complete your profile?
      </h2>
      <ul className="mt-3.5 space-y-3">
        {REASONS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ds-green-soft)]">
              <Icon className="h-3.5 w-3.5 text-[var(--ds-green)]" aria-hidden="true" />
            </span>
            <div>
              <p className={`text-sm font-medium ${profileHeadingClass}`}>{title}</p>
              <p className={`mt-0.5 text-[13px] leading-snug ${profileSecondaryTextClass}`}>
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
