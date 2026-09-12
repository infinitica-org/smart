'use client';

import Link from 'next/link';
import { Plus, ExternalLink, ArrowLeft, Award, FileText } from 'lucide-react';
import { useQuery } from '@smart/ui';
import { PageHeader, Surface, EmptyState } from '@/components/dashboard/ConsoleChrome';
import { CertificateStatusBadge } from '@/components/certificates/certificate-status-badge';
import { api } from '@/lib/api';

const IN_PROGRESS_STATUSES = new Set(['DECLARED', 'UPLOADED']);

export default function CertificatesPage() {
  const { data } = useQuery({
    queryKey: ['me', 'candidate-certificates'] as const,
    queryFn: () => api.candidateCertificates.listMine(),
  });
  const certificates = data?.certificates ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <span className="text-xs text-muted-foreground">
          Certifications are optional for your profile
        </span>
      </div>

      <PageHeader
        title="External Certifications"
        subtitle="Declare provider certificates (AWS, Coursera, etc.), upload proof documents or source URLs, and track verification status."
        action={
          <Link
            href="/certificates/add"
            className="inline-flex items-center gap-2 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#7dffe6]"
          >
            <Plus className="h-4 w-4" /> Add Certificate
          </Link>
        }
      />

      {certificates.length === 0 ? (
        <EmptyState
          title="No certificates added yet"
          body="Adding external certifications is optional. You can add AWS, Coursera, Google, or Microsoft certificates anytime to highlight your verified skills."
          action={
            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/certificates/add"
                className="inline-flex items-center gap-2 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#7dffe6]"
              >
                <Plus className="h-4 w-4" /> Add Your First Certificate
              </Link>
              <Link
                href="/dashboard"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Continue to Dashboard
              </Link>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {certificates.map((certificate) => (
            <Surface
              key={certificate.certificateId}
              className="flex flex-wrap items-center justify-between gap-4 p-5 transition-all hover:border-gray-300"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#00967c]" />
                  <h3 className="font-semibold text-gray-900">{certificate.title}</h3>
                </div>
                <p className="text-sm text-gray-500">{certificate.issuer}</p>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {certificate.certificateNumber && (
                    <span className="font-mono">ID: {certificate.certificateNumber}</span>
                  )}
                  {certificate.issueDate && <span>Issued: {certificate.issueDate}</span>}
                  {certificate.verificationUrl && (
                    <a
                      href={certificate.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#00967c] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View Source URL
                    </a>
                  )}
                  {certificate.certificateFileName && (
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <FileText className="h-3 w-3" /> {certificate.certificateFileName}
                    </span>
                  )}
                </div>

                {certificate.skills.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {certificate.skills.map((skill) => (
                      <span
                        key={skill.skillCode}
                        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                      >
                        {skill.skillName} ({skill.selfAssessedProficiency})
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <CertificateStatusBadge status={certificate.status} />
                {certificate.sourceStatus === 'source_verified' &&
                certificate.agendaLines &&
                certificate.agendaLines.length > 0 &&
                certificate.status !== 'VERIFIED' ? (
                  <Link
                    href={`/certificates/${certificate.certificateId}/verify`}
                    className="text-sm text-[#00967c] hover:underline"
                  >
                    Take assessment
                  </Link>
                ) : null}
                <Link
                  href={`/certificates/add?id=${certificate.certificateId}`}
                  className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  {IN_PROGRESS_STATUSES.has(certificate.status) ? 'Continue' : 'View Details'}
                </Link>
                {certificate.expiryDate ? (
                  <span className="text-xs text-gray-400">
                    Expires {new Date(certificate.expiryDate).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
