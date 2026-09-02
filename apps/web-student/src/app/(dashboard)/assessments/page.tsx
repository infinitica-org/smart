'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, FileText } from 'lucide-react';
import { COMPLETED_ASSESSMENTS, UPCOMING_ASSESSMENTS } from '@/lib/candidate-dashboard-data';
import { api } from '@/lib/api';
import { playerErrorFromUnknown, resolveL1TrackCode, startL1Request } from '@/lib/l1-mcq';
import { cn } from '@smart/ui';

export default function AssessmentsPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const startL1 = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const me = await api.auth.me();
      let trackCode = resolveL1TrackCode(me);
      if (!trackCode) {
        const tracks = await api.catalog.tracks();
        trackCode = resolveL1TrackCode(me, tracks);
      }
      if (!trackCode) {
        setStartError('No enrolled L1 track is available to start.');
        return;
      }
      const session = await api.assessment.start(startL1Request(trackCode));
      router.push(`/assessments/${session.attemptId}`);
    } catch (error) {
      setStartError(playerErrorFromUnknown(error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-8 pb-16">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-white">Assessments</h1>
        <p className="mt-2 text-sm text-white/40">
          Ready starts the L1 MCQ for your enrolled track. The server owns the clock.
        </p>
        {startError ? <p className="mt-3 text-sm text-amber-300">{startError}</p> : null}
      </div>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold tracking-wider text-white/35 uppercase">Upcoming</p>
        {UPCOMING_ASSESSMENTS.map((item) => {
          const ready = item.status === 'Ready';
          return (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#141414] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00fad0]/10 text-[#00fad0]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-white/35">
                    {item.company} · {item.type} · {item.duration}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-white/30">
                    <Clock className="h-3.5 w-3.5" /> Deadline {item.deadline}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!ready ? (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" /> Opens near window
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={!ready || starting}
                  onClick={() => {
                    if (ready) void startL1();
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold',
                    ready
                      ? 'bg-[#00fad0] text-black'
                      : 'cursor-not-allowed bg-white/5 text-white/25',
                  )}
                >
                  {starting && ready ? 'Starting…' : 'Start'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          Completed
        </p>
        {COMPLETED_ASSESSMENTS.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-[#141414] p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white">{item.title}</h3>
                <p className="mt-1 text-xs text-white/35">
                  {item.company} · {item.completedOn}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-[#00fad0]">Score {item.score}</span>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-white/25">
        <Link href="/dashboard" className="text-[#00fad0] hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
