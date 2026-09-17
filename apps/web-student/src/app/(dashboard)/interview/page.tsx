import Link from 'next/link';

export default function InterviewPage() {
  return (
    <div className="min-h-full bg-[var(--ds-canvas)]">
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--ds-text)]">
          Interview
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--ds-text-muted)]">
          Defense interviews and spoken assessments will appear here as part of your certification
          journey. This area is not wired to a student interview module in the API yet.
        </p>
        <Link
          href="/assessment"
          className="mt-6 inline-flex text-sm font-semibold text-[var(--ds-green)] hover:text-[var(--ds-green-hover)]"
        >
          Go to Assessment →
        </Link>
      </div>
    </div>
  );
}
