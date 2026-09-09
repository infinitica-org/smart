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
        <h2 id="certificates-heading" className="text-xl font-semibold tracking-tight text-white">
          Certifications
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Professional certifications and verified credentials that CV and Work Experience can
          attach to.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/40">Loading certificates…</p>
      ) : certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Award className="h-10 w-10 text-white/20" />
          <p className="mt-2 text-sm font-medium text-white/60">
            No candidate certificates attached yet
          </p>
          <p className="text-xs text-white/40">
            Certificates earned or imported will be listed here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.certificateId}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00fad0]/10 text-[#00fad0]">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    {cert.title || 'Untitled Certificate'}
                  </h3>
                  <p className="text-sm text-white/70">Issuer: {cert.issuer || 'Unknown Issuer'}</p>
                  {cert.issueDate && (
                    <p className="mt-1 text-xs text-white/45">Issued: {cert.issueDate}</p>
                  )}
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                {cert.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
