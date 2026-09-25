import type { Metadata } from 'next';
import Link from 'next/link';
import { SmartLogo } from '@smart/ui';

export const metadata: Metadata = {
  title: 'Terms & Conditions · SMART',
  description: 'Terms & Conditions governing your use of the SMART platform.',
};

export default function TermsPage() {
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
              TERMS &amp; CONDITIONS
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500">
              Last Updated: <span className="text-slate-700">September 25, 2026</span>
            </p>
          </div>

          <div className="prose prose-slate max-w-none pt-8 leading-relaxed text-slate-700">
            <p>
              Welcome to <strong>SMART</strong> (&quot;SMART&quot;, &quot;we&quot;, &quot;us&quot;,
              or &quot;our&quot;). These Terms &amp; Conditions (&quot;Terms&quot;) govern your
              access to and use of the SMART website, application, platform, products, and services
              (collectively, the &quot;Platform&quot;).
            </p>

            <p className="font-medium text-slate-800">
              By accessing, registering on, or using SMART, you agree to be bound by these Terms. If
              you do not agree with these Terms, please do not use the Platform.
            </p>

            <hr className="my-8 border-slate-100" />

            <h2 className="text-xl font-bold text-slate-900">1. About SMART</h2>
            <p>
              SMART is a platform designed to connect students, freshers, educational institutions,
              and employers through career opportunities, skill assessments, candidate profiles, and
              verification services.
            </p>
            <p>SMART may provide services including:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Job and internship opportunities</li>
              <li>Candidate profiles</li>
              <li>Skill assessments</li>
              <li>Coding and technical assessments</li>
              <li>Candidate verification</li>
              <li>Project verification</li>
              <li>Credential and certificate verification</li>
              <li>Employment/work verification</li>
              <li>Employer recruitment services</li>
              <li>Other career-related services</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-slate-900">2. Eligibility</h2>
            <p>You must meet the applicable age and eligibility requirements to use SMART.</p>
            <p>By using SMART, you confirm that:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>The information you provide is accurate and complete.</li>
              <li>You have the legal capacity to agree to these Terms.</li>
              <li>You will use SMART only for lawful purposes.</li>
              <li>You will comply with all applicable laws and regulations.</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-slate-900">3. Account Registration</h2>
            <p>Certain features of SMART may require you to create an account.</p>
            <p>You are responsible for:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Providing accurate information.</li>
              <li>Keeping your account credentials confidential.</li>
              <li>Maintaining the security of your account.</li>
              <li>Not sharing your account with another person.</li>
              <li>Informing SMART of any unauthorised access to your account.</li>
            </ul>
            <p>
              SMART reserves the right to suspend or terminate accounts containing false,
              misleading, or fraudulent information.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">4. User Information</h2>
            <p>Users may provide information including:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Personal information</li>
              <li>Educational qualifications</li>
              <li>Skills</li>
              <li>Projects</li>
              <li>Work experience</li>
              <li>Certificates</li>
              <li>Credentials</li>
              <li>Professional profiles</li>
              <li>Assessment results</li>
              <li>Other career-related information</li>
            </ul>
            <p>
              You are responsible for ensuring that the information submitted by you is accurate,
              genuine, and up to date. You must not submit another person&apos;s information, work,
              credentials, certificates, or qualifications as your own.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">5. Job Opportunities</h2>
            <p>SMART may provide job and internship listings from employers.</p>
            <p>SMART does not guarantee:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Employment or placement</li>
              <li>Interview selection</li>
              <li>Job offers</li>
              <li>Salary</li>
              <li>Employer response</li>
              <li>Career outcomes</li>
            </ul>

            <h2 className="mt-8 text-xl font-bold text-slate-900">6. Assessments</h2>
            <p>
              SMART may provide assessments to evaluate skills, knowledge, reasoning, coding
              ability, communication, domain knowledge, and other competencies.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">7. Assessment Rules</h2>
            <p>
              Users must complete assessments honestly and in accordance with the applicable
              assessment instructions. Cheating, copying, or impersonation is strictly prohibited.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">8. Verification Services</h2>
            <p>
              SMART may provide verification services for projects, credentials, certificates, and
              work experience submitted by candidates. Verification results depend on available data
              and sources.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">9. User-Submitted Content</h2>
            <p>
              You retain ownership of content that you submit to SMART, subject to the rights
              required for SMART to provide its services.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">10. Artificial Intelligence</h2>
            <p>
              SMART may use artificial intelligence and automated technologies for assessment
              evaluation, recommendations, verification workflows, and feedback generation.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">11. Employer Responsibilities</h2>
            <p>
              Employers using SMART must provide accurate job information, use candidate data only
              for legitimate recruitment, and comply with all applicable privacy laws.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">12. Privacy</h2>
            <p>
              The collection and processing of personal information are governed by the{' '}
              <Link href="/privacy" className="font-semibold text-blue-600 underline">
                SMART Privacy Policy
              </Link>
              .
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">13. Governing Law</h2>
            <p>
              These Terms shall be governed by and interpreted in accordance with the laws of{' '}
              <strong>India</strong>.
            </p>

            <h2 className="mt-8 text-xl font-bold text-slate-900">14. Contact Us</h2>
            <p>
              If you have questions regarding these Terms, contact us at{' '}
              <a href="mailto:support@smart.com" className="font-semibold text-blue-600 underline">
                support@smart.com
              </a>
              .
            </p>
          </div>

          <div className="mt-12 flex justify-between border-t border-slate-100 pt-8 text-sm font-medium">
            <Link href="/login" className="text-slate-600 hover:text-black hover:underline">
              &larr; Back to Sign In
            </Link>
            <Link href="/privacy" className="text-blue-600 hover:underline">
              View Privacy Policy &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
