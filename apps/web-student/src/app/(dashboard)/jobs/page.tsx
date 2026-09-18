import Link from 'next/link';

export default function JobsPage() {
  return (
    <div className="min-h-full bg-[var(--ds-canvas)]">
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--ds-text)]">Jobs</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--ds-text-muted)]">
          Placement opportunities and job applications for your institution will show up here when
          the student jobs experience is connected to placement APIs.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex text-sm font-semibold text-[var(--ds-green)] hover:text-[var(--ds-green-hover)]"
        >
          Back to Home →
        </Link>
      </div>
    </div>
  );
}
