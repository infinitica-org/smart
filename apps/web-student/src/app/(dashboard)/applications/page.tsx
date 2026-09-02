'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin } from 'lucide-react';
import { APPLICATIONS, ATS_STAGES } from '@/lib/candidate-dashboard-data';
import { cn } from '@smart/ui';

const ATS = ATS_STAGES;

function StageBar({ stage, labels = true }: { stage: (typeof ATS)[number]; labels?: boolean }) {
  const current = ATS.indexOf(stage);
  return (
    <div className="flex flex-1 gap-1">
      {ATS.map((label, i) => (
        <div key={label} className="min-w-0 flex-1">
          <div
            className={cn('h-1.5 rounded-full', i <= current ? 'bg-[#00fad0]' : 'bg-white/10')}
          />
          {labels ? (
            <p className="mt-1.5 hidden truncate text-[10px] text-white/30 sm:block">{label}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function ApplicationsPage() {
  const [id, setId] = useState(APPLICATIONS[0]?.id ?? '');
  const selected = useMemo(() => APPLICATIONS.find((a) => a.id === id) ?? APPLICATIONS[0], [id]);

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl rounded-[32px] border border-dashed border-white/15 px-8 py-16 text-center">
        <h1 className="font-display text-3xl text-white">No applications yet</h1>
        <p className="mt-2 text-sm text-white/40">
          Strengthen your profile first — applications appear here with an ATS timeline.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black"
        >
          Continue profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-white">
          Applications
        </h1>
        <p className="mt-2 text-sm text-white/40">Timeline mirrors the company ATS.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          {APPLICATIONS.map((app) => {
            const active = app.id === selected.id;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => setId(app.id)}
                className={cn(
                  'w-full rounded-[28px] border p-4 text-left transition',
                  active
                    ? 'border-[#00fad0]/35 bg-[#1a1a1a]'
                    : 'border-white/10 bg-[#141414] hover:border-white/20',
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                      active ? 'bg-[#00fad0]/15 text-[#00fad0]' : 'bg-white/5 text-white/35',
                    )}
                  >
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{app.role}</p>
                    <p className="mt-0.5 text-xs text-white/35">{app.company}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#00fad0]">{app.matchScore}%</span>
                </div>
                <div className="mt-3">
                  <StageBar stage={app.stage} labels={false} />
                </div>
                <p className="mt-2 text-[11px] text-white/30">{app.stage}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 lg:col-span-8 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-black">
              {selected.company}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-white/35">
              <MapPin className="h-3.5 w-3.5" /> {selected.location}
            </span>
            <span className="text-xs text-white/25">Applied {selected.appliedDate}</span>
          </div>
          <h2 className="mt-5 font-display text-3xl font-medium text-white md:text-4xl">
            {selected.role}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/40">
            {selected.description}
          </p>

          <div className="mt-10">
            <p className="mb-3 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
              ATS status
            </p>
            <StageBar stage={selected.stage} />
          </div>

          <div className="mt-10 rounded-[24px] bg-black/30 p-5">
            <p className="text-[11px] font-semibold tracking-wider text-[#00fad0] uppercase">
              Why this match
            </p>
            <p className="mt-2 text-sm text-white/65">{selected.why}</p>
            <p className="mt-3 text-xs text-white/35">Match {selected.matchScore}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
