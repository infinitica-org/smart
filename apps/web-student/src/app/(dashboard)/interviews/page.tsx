'use client';

import Link from 'next/link';
import { Video } from 'lucide-react';

/**
 * No interviews backend exists yet (no scheduling/list endpoint in api-core).
 * This is an honest empty state rather than fabricated companies/scores —
 * swap for real data once that module ships.
 */
export default function InterviewsPage() {
  return (
    <div className="mx-auto w-full max-w-[920px] space-y-8 pb-16">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-white">Interviews</h1>
        <p className="mt-2 text-sm text-white/40">Run a system check before you join.</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-white/15 px-8 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white/40">
          <Video className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-medium text-white">No interviews scheduled</h2>
        <p className="max-w-sm text-sm text-white/40">
          When a company schedules an interview after reviewing your application, it will appear
          here with a system check before you join.
        </p>
      </div>

      <p className="text-center text-xs text-white/25">
        <Link href="/dashboard" className="text-[#00fad0] hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
