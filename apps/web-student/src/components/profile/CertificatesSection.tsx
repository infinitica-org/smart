'use client';

import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import type { CandidateCertificateDto } from '@smart/contracts';
import { api } from '@/lib/api';

export function CertificatesSection() {
  const [certificates, setCertificates] = useState<CandidateCertificateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.candidateCertificates.listMine();
        if (!cancelled) setCertificates(res.certificates || []);
      } catch (err: unknown) {
        if (!cancelled)
          setError((err as Error)?.message || 'Failed to load candidate certificates.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="flex flex-col gap-6" aria-labelledby="certificates-heading">
      <div>
        <h2
          id="certificates-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Certifications
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Professional certifications and verified credentials that CV and Work Experience can
          attach to.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading certificates…</p>
      ) : certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <Award className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground/80">
            No candidate certificates attached yet
          </p>
          <p className="text-xs text-muted-foreground">
            Certificates earned or imported will be listed here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.certificateId}
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground/10 text-foreground">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {cert.title || 'Untitled Certificate'}
                  </h3>
                  <p className="text-sm text-foreground/80">
                    Issuer: {cert.issuer || 'Unknown Issuer'}
                  </p>
                  {cert.issueDate && (
                    <p className="mt-1 text-xs text-muted-foreground">Issued: {cert.issueDate}</p>
                  )}
                </div>
              </div>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                {cert.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
