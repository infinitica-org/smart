'use client';

import Link from 'next/link';
import { Award, Plus, ShieldCheck } from 'lucide-react';
import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';
import { CertificateEntryCard } from '@/components/profile/CertificateEntryCard';
import {
  ProfileBentoEmptyPanel,
  ProfileSectionError,
  ProfileSectionHeader,
} from '@/components/profile/ProfileSectionChrome';
import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
import { profileSectionMeta } from '@/lib/profile-sections';

export function CertificatesSection() {
  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['me', 'candidate-certificates'] as const,
    queryFn: () => api.candidateCertificates.listMine(),
    staleTime: 60_000,
  });

  const certificates = data?.certificates ?? [];
  const error = queryError
    ? (queryError as Error).message || 'Failed to load candidate certificates.'
    : null;
  const meta = profileSectionMeta('certifications');

  return (
    <section
      className="flex w-full min-w-0 flex-col gap-4 font-[family-name:var(--tpo-font-sans)]"
      aria-label="Certifications"
    >
      <ProfileSectionHeader
        title={meta.title}
        description="External credentials from AWS, Coursera, Google, and other providers — verified and shown on your public profile."
        action={
          <Link
            href="/certificates/add"
            className={`${profilePrimaryButtonSmClass} justify-center px-4 py-2.5 text-[13px] font-semibold tracking-[-0.01em]`}
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            Add certificate
          </Link>
        }
      />

      {error ? <ProfileSectionError>{error}</ProfileSectionError> : null}

      {loading ? (
        <p className="text-sm text-[var(--ds-text-muted)]">Loading certifications…</p>
      ) : null}

      {!loading && certificates.length === 0 ? (
        <ProfileBentoEmptyPanel
          tipIcon={ShieldCheck}
          tipIconClassName="text-[#0284c7]"
          tipTitle="Showcase verified credentials"
          tipBody="Optional but powerful — attach proof or issuer links so recruiters see skills you have already validated elsewhere."
          emptyIcon={Award}
          emptyTitle="No certifications yet"
          emptyBody="When you add a certificate, it appears here with verification status and linked skills."
          actions={
            <Link
              href="/certificates/add"
              className={`${profilePrimaryButtonSmClass} justify-center px-5 py-2.5 text-[13px]`}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              Add your first certificate
            </Link>
          }
        />
      ) : null}

      {!loading && certificates.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map((cert, index) => (
            <CertificateEntryCard key={cert.certificateId} certificate={cert} accentIndex={index} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
