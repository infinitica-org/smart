'use client';

import { SmartLogo } from '@smart/ui';

const HIGHLIGHTS = [
  '5 levels, 3 tiers',
  'Publicly verifiable credentials',
  'Role-specific readiness',
];

export function LoginBrandPanel() {
  return (
    <section
      className="relative hidden h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-[28px] px-10 py-10 lg:flex xl:px-12"
      style={{ background: 'var(--background)' }}
      aria-label="About SMART"
    >
      {/* Replace with a local file in public/ if you prefer to self-host the photo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

      <h1 className="font-heading relative z-10 text-[4.25rem] font-extrabold uppercase leading-[0.92] tracking-tight text-[var(--brand-teal)] xl:text-[5.25rem]">
        Get
        <br />
        Ready
        <br />
        Get Hired
      </h1>

      <div className="relative z-10 space-y-6">
        <ul className="space-y-1 text-xl font-semibold text-white">
          {HIGHLIGHTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <SmartLogo kind="wordmark" tone="on-dark" className="h-8" title="SMART" />
      </div>
    </section>
  );
}
