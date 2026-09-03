'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/dashboard/ConsoleChrome';

export default function InterviewsPage() {
  return (
    <div className="mx-auto w-full max-w-[920px] space-y-8 pb-16">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-white">Interviews</h1>
        <p className="mt-2 text-sm text-white/40">
          Interview scheduling is not on a student API yet.
        </p>
      </div>

      <EmptyState
        title="Interview calendar unavailable"
        body="SMART does not expose a student interview list contract. Fixture companies and scores have been removed so this page cannot be mistaken for live data."
        action={
          <Link href="/dashboard" className="text-sm font-medium text-[#00fad0] hover:underline">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
