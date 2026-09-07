import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Digital Personal Data Protection Act (DPDP Act), 2023 - Privacy Notice | SMART Platform',
  description:
    'Statutory Data Privacy Notice issued pursuant to Sections 5 & 6 of the Digital Personal Data Protection Act (DPDP Act), 2023.',
};

export default function DpdpPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
        {/* Header */}
        <div className="border-b border-gray-200 pb-5 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Digital Personal Data Protection Act (DPDP Act), 2023
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              Statutory Privacy Notice Issued Pursuant to Sections 5 and 6 of the DPDP Act, 2023
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-700/10 whitespace-nowrap">
            DPDP Act 2023
          </span>
        </div>

        {/* Formal Legal Content */}
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">
              1. Regulatory Identification & Data Fiduciary Notice
            </h2>
            <p className="text-xs text-gray-600">
              <strong>SMART Platform</strong> (&quot;Data Fiduciary&quot;) hereby notifies all
              registered candidates and applicants (&quot;Data Principals&quot;) regarding the
              processing of digital personal data under the{' '}
              <strong>Digital Personal Data Protection Act (DPDP Act), 2023</strong>. Personal data
              is collected and processed strictly in accordance with statutory mandates under the
              DPDP Act, 2023.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">
              2. Processing Inventory & Statutory Purposes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 border-b border-gray-200">
                    <th className="p-2.5 border-r border-gray-200 font-semibold">Category</th>
                    <th className="p-2.5 border-r border-gray-200 font-semibold">
                      Personal Data Elements
                    </th>
                    <th className="p-2.5 border-r border-gray-200 font-semibold">
                      Authorized Purpose
                    </th>
                    <th className="p-2.5 font-semibold">Statutory Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="p-2.5 border-r border-gray-200 font-medium">
                      Identity & Academics
                    </td>
                    <td className="p-2.5 border-r border-gray-200">
                      Full Name, Contact Details, University ID, CGPA, Resume
                    </td>
                    <td className="p-2.5 border-r border-gray-200">
                      Profile Verification & Employer Roster Matching
                    </td>
                    <td className="p-2.5">Explicit Consent (Sec. 6)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-gray-200 font-medium">
                      Career Preferences
                    </td>
                    <td className="p-2.5 border-r border-gray-200">
                      Target Roles, Work Modes (Remote/Hybrid/Onsite), Expected CTC
                    </td>
                    <td className="p-2.5 border-r border-gray-200">
                      Matching Profiles with Corporate Placement Drives
                    </td>
                    <td className="p-2.5">Explicit Consent (Sec. 6)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-gray-200 font-medium">
                      Assessment Telemetry
                    </td>
                    <td className="p-2.5 border-r border-gray-200">
                      Objective Responses, Code Submissions, Proctoring Liveness Telemetry
                    </td>
                    <td className="p-2.5 border-r border-gray-200">
                      Skill Evaluation, Anti-Cheating Verification, & Certification
                    </td>
                    <td className="p-2.5">Assessment Execution & Consent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">
              3. Data Protection Obligations & Retention Safeguards
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-xs text-gray-600">
              <li>
                <strong>Consent Governance:</strong> Processing is executed solely upon voluntary,
                explicit, and un-prechecked opt-in consent. Data Principals retain the unconditional
                right to withdraw consent at any time without retroactive invalidation of prior
                lawful processing.
              </li>
              <li>
                <strong>Purpose Limitation & Non-Commercialization:</strong> Personal data is
                strictly restricted to recruitment and skill evaluation. Personal data is{' '}
                <strong>never sold, leased, or commercialized</strong> to third-party advertisers or
                data brokers.
              </li>
              <li>
                <strong>Storage Limitation & Automated Eradication:</strong> Proctoring snapshots
                and audio telemetry stored in object repositories are automatically{' '}
                <strong>permanently purged within thirty (30) days</strong> following score
                certification. Candidate profile records are retained for the duration of the active
                placement cycle or until formal deletion is requested.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2 border-t border-gray-200 pt-4">
            <h2 className="text-base font-semibold text-gray-900">
              4. Statutory Rights of Data Principals & Grievance Redressal
            </h2>
            <p className="text-xs text-gray-600">
              Pursuant to Sections 11 through 14 of the Digital Personal Data Protection Act (DPDP
              Act), 2023, Data Principals possess statutory rights to:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-600">
              <li>
                <strong>Request Summary of Processing & Access</strong> (Section 11)
              </li>
              <li>
                <strong>Seek Correction, Completion, & Erasure</strong> (Section 12)
              </li>
              <li>
                <strong>File Grievances & Seek Redressal</strong> (Section 13)
              </li>
            </ol>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs font-mono mt-3">
              <p className="font-semibold text-gray-900 mb-1">
                Office of the Data Protection Officer (DPO)
              </p>
              <p>
                <strong>Email:</strong> dpo@smartplatform.in
              </p>
              <p>
                <strong>Statutory Resolution SLA:</strong> Acknowledgment within twenty-four (24)
                hours; formal resolution within seven (7) business days.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-4 flex justify-between items-center text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} SMART Platform. All statutory rights under DPDP Act
            2023 reserved.
          </p>
          <Link href="/onboarding" className="text-blue-600 hover:underline font-semibold">
            &larr; Return to Candidate Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
