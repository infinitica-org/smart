import type { Metadata } from 'next';
import Link from 'next/link';
import { SmartLogo } from '@smart/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy · SMART',
  description: 'Privacy Policy governing your data and information on the SMART platform.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh w-full bg-slate-50 text-[#172033]">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/login" className="flex items-center gap-2">
            <SmartLogo kind="text" className="h-7 w-auto" title="SMART" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            Back to Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <div className="border-b border-slate-100 pb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              PRIVACY POLICY
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Last Updated: <span className="text-slate-700">September 25, 2026</span>
            </p>
          </div>

          <div className="prose prose-slate max-w-none pt-8 leading-relaxed text-slate-700">
            <p>
              At <strong>SMART</strong> (&quot;SMART&quot;, &quot;we&quot;, &quot;us&quot;, or
              &quot;our&quot;), we respect your privacy and are committed to protecting your
              personal information. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you access or use the SMART platform.
            </p>

            <hr className="my-8 border-slate-100" />

            <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            <p>We may collect information including:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>
                <strong>Account Information:</strong> Name, school/personal email, password hash,
                and contact details.
              </li>
              <li>
                <strong>Candidate Profile Data:</strong> Education history, skills, certifications,
                work experiences, and projects.
              </li>
              <li>
                <strong>Assessment &amp; Performance Data:</strong> Assessment scores, response
                logs, coding submissions, and proctoring telemetry.
              </li>
              <li>
                <strong>Usage &amp; Device Information:</strong> IP address, browser type, log data,
                and interaction history.
              </li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-slate-900">
              2. How We Use Your Information
            </h2>
            <p>We use the collected information for purposes including:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Providing and personalizing career certification and job placement services.</li>
              <li>Evaluating and scoring candidate skill assessments.</li>
              <li>Verifying candidate projects, credentials, and work history.</li>
              <li>
                Connecting candidates with participating educational institutions and prospective
                employers.
              </li>
              <li>Maintaining platform security, fraud prevention, and proctoring integrity.</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-slate-900">
              3. Information Sharing &amp; Disclosure
            </h2>
            <p>
              We do not sell your personal data. We share your information only as described below:
            </p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>
                <strong>With Employers &amp; Institutions:</strong> Verified credentials and
                assessment results are shared with employers and your institution upon your consent
                or job applications.
              </li>
              <li>
                <strong>Service Providers:</strong> Trusted third-party vendors assisting in cloud
                infrastructure, email delivery, and storage.
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to protect legal rights
                and platform security.
              </li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-slate-900">4. Data Security</h2>
            <p>
              We implement industry-standard encryption, strict access controls, and secure
              infrastructure to protect your personal information against unauthorized access, loss,
              or misuse.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">5. Your Rights &amp; Choices</h2>
            <p>
              You have the right to access, update, or request the deletion of your personal data
              stored on SMART. You may also opt out of promotional emails using the unsubscribe link
              provided in our communications.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">6. Contact Privacy Team</h2>
            <p>
              For privacy-related inquiries or data subject requests, please contact our Data
              Protection team at{' '}
              <a href="mailto:privacy@smart.com" className="font-semibold text-blue-600 underline">
                privacy@smart.com
              </a>
              .
            </p>
          </div>

          <div className="mt-12 flex justify-between border-t border-slate-100 pt-8 text-sm font-medium">
            <Link href="/login" className="text-slate-600 hover:text-black hover:underline">
              &larr; Back to Sign In
            </Link>
            <Link href="/terms" className="text-blue-600 hover:underline">
              View Terms &amp; Conditions &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
