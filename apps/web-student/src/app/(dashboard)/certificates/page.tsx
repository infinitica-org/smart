'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
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
      <PageHeader
        title="Certificates"
        subtitle="Declare externally-issued certificates, upload proof, and get them verified."
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
          title="No certificates yet"
          body="Add an externally-issued certificate (AWS, Coursera, etc.) to start verification."
          action={
            <Link
              href="/certificates/add"
              className="inline-flex items-center gap-2 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#7dffe6]"
            >
              <Plus className="h-4 w-4" /> Add Certificate
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {certificates.map((certificate) => (
            <Surface
              key={certificate.certificateId}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-medium text-white">{certificate.title}</h3>
                <p className="text-sm text-white/45">{certificate.issuer}</p>
                {certificate.skills.length > 0 ? (
                  <p className="mt-1 text-xs text-white/30">
                    {certificate.skills.map((skill) => skill.skillName).join(' · ')}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <CertificateStatusBadge status={certificate.status} />
                {IN_PROGRESS_STATUSES.has(certificate.status) ? (
                  <Link
                    href={`/certificates/add?id=${certificate.certificateId}`}
                    className="text-sm text-[#00fad0] hover:underline"
                  >
                    Continue
                  </Link>
                ) : null}
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
