'use client';

import { useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import type { SchoolPublicProfile } from '../../lib/school-public-profile';
import { isInstitutionVerified } from '../../lib/school-public-profile';
import { bentoCardClass } from '../../lib/tpo-dashboard-ui';

const DEFAULT_BANNER_CLASS =
  'h-[148px] w-full bg-[repeating-linear-gradient(-48deg,#1b4332,#1b4332_11px,#2d6a4f_11px,#2d6a4f_22px)] md:h-[168px]';

type SchoolProfileCardProps = {
  profile: SchoolPublicProfile;
  logoUrl: string | null;
  bannerUrl: string | null;
  employersRecruitingCount?: number | null;
  placementRatePercent?: number | null;
  uploadingLogo?: boolean;
  uploadingBanner?: boolean;
  onPickLogo: (file: File) => void;
  onPickBanner: (file: File) => void;
};

function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export function SchoolProfileCard({
  profile,
  logoUrl,
  bannerUrl,
  employersRecruitingCount = null,
  placementRatePercent = null,
  uploadingLogo = false,
  uploadingBanner = false,
  onPickLogo,
  onPickBanner,
}: SchoolProfileCardProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const verified = isInstitutionVerified(profile.verificationStatus);
  const studentCount = profile.candidateUsage.toLocaleString('en-US');
  const metaLine = [
    verified ? 'Verified' : 'Pending verification',
    '4-year',
    `${studentCount} students on SMART`,
  ].join(' · ');
  const employerStat =
    employersRecruitingCount != null ? employersRecruitingCount.toLocaleString('en-US') : '—';

  return (
    <article
      aria-labelledby="school-profile-heading"
      className={`${bentoCardClass} overflow-visible !p-0`}
    >
      <div className="relative overflow-hidden rounded-t-[20px] lg:rounded-t-[22px]">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="h-[148px] w-full object-cover md:h-[168px]" />
        ) : (
          <div className={DEFAULT_BANNER_CLASS} aria-hidden />
        )}
        <button
          type="button"
          disabled={uploadingBanner}
          aria-label={bannerUrl ? 'Change cover banner' : 'Upload cover banner'}
          onClick={() => bannerInputRef.current?.click()}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/45 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-60"
        >
          {uploadingBanner ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Camera className="size-3.5" aria-hidden />
          )}
          {bannerUrl ? 'Change banner' : 'Add banner'}
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPickBanner(file);
            event.target.value = '';
          }}
        />
      </div>

      <div className="px-5 pb-7 pt-0 md:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative -mt-10 size-[88px] shrink-0 sm:-mt-12 sm:size-[96px]">
            <div className="flex size-full items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-[var(--ds-surface)] shadow-[var(--ds-card-shadow)]">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Logo
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={uploadingLogo}
              aria-label={logoUrl ? 'Change school logo' : 'Upload school logo'}
              onClick={() => logoInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-icon)] shadow-[var(--ds-card-shadow)] transition hover:bg-[var(--ds-surface-hover)] disabled:opacity-60"
            >
              {uploadingLogo ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-3.5" aria-hidden />
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onPickLogo(file);
                event.target.value = '';
              }}
            />
          </div>

          <div className="min-w-0 flex-1 pb-1 pt-2 sm:pt-0">
            <h1
              id="school-profile-heading"
              className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ds-text)] md:text-[30px]"
            >
              {profile.institutionName}
            </h1>
            <p className="mt-1.5 text-[14px] italic text-[var(--ds-text-muted)]">{metaLine}</p>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-[15px] italic leading-relaxed text-[var(--ds-text-muted)]">
          {profile.about}
        </p>

        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <p className="text-[28px] font-bold leading-none tracking-tight text-[var(--ds-text)] md:text-[32px]">
              {formatPercent(placementRatePercent)}
            </p>
            <p className="mt-1.5 text-[14px] italic text-[var(--ds-text-muted)]">placement rate</p>
          </div>
          <div>
            <p className="text-[28px] font-bold leading-none tracking-tight text-[var(--ds-text)] md:text-[32px]">
              {employerStat}
            </p>
            <p className="mt-1.5 text-[14px] italic text-[var(--ds-text-muted)]">
              employers recruiting here
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
