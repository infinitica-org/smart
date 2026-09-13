'use client';

import { use } from 'react';
import { useQuery } from '@smart/ui';
import { CertVerifyPlayer } from '@/components/assessment/cert-verify-player';
import { PageHeader } from '@/components/dashboard/ConsoleChrome';
import { api } from '@/lib/api';

export default function CertificateVerifyPage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = use(params);
  const { data: certificate, isLoading } = useQuery({
    queryKey: ['me', 'candidate-certificates', certificateId] as const,
    queryFn: () => api.candidateCertificates.get(certificateId),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading certificate…</p>;
  }

  if (!certificate) {
    return <p className="text-sm text-red-300">Certificate not found.</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-12">
      <PageHeader
        title="Certificate assessment"
        subtitle={`Proctored check for ${certificate.title} (${certificate.issuer}).`}
      />
      <CertVerifyPlayer certificateId={certificateId} title={certificate.title} />
    </div>
  );
}
