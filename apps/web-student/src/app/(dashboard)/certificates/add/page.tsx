'use client';

import { Suspense } from 'react';
import { CertificateWizard } from '@/components/certificates/certificate-wizard';

export default function AddCertificatePage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <CertificateWizard />
      </Suspense>
    </div>
  );
}
