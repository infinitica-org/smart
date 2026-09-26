'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, GraduationCap, Briefcase, Share2, CheckCircle2, X, Mail } from 'lucide-react';
import type { AuthenticatedUser, CandidateEducationDto } from '@smart/contracts';

import { ProfilePhotoEditControl } from '@/components/profile/ProfilePhotoEditControl';
import {
  primaryBatchLabel,
  primaryDepartmentName,
  primaryInstitutionName,
} from '@/lib/profile-identity';

// Official SMART 16-point scalloped verified badge
export function SmartVerifiedBadge(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      {...props}
    >
      <path
        d="M5.89596 15.5452C5.56658 15.6923 5.17931 15.5651 5.00143 15.2512L3.9333 13.3666L1.90833 12.8952C1.56822 12.816 1.33848 12.4983 1.36989 12.1505L1.56966 9.93802L0.162633 8.25342C-0.0543614 7.99361 -0.0543617 7.61576 0.162633 7.35596L1.56966 5.67135L1.36989 3.45892C1.33848 3.11113 1.56822 2.79338 1.90833 2.7142L3.9333 2.24278L5.00143 0.358158C5.17931 0.044304 5.56658 -0.0829616 5.89596 0.0641976L7.78784 0.909449L9.67972 0.0641977C10.0091 -0.0829615 10.3964 0.0443043 10.5743 0.358158L11.6424 2.24278L13.6673 2.7142C14.0075 2.79338 14.2372 3.11113 14.2058 3.45892L14.006 5.67135L15.4131 7.35596C15.63 7.61576 15.63 7.99361 15.4131 8.25342L14.006 9.93802L14.2058 12.1505C14.2372 12.4982 14.0075 12.816 13.6673 12.8952L11.6424 13.3666L10.5743 15.2512C10.3964 15.5651 10.0091 15.6923 9.67972 15.5452L7.78784 14.6999L5.89596 15.5452ZM6.95187 10.4337C6.99126 10.4749 7.05715 10.4749 7.09654 10.4337L11.0685 6.27253C11.105 6.23438 11.1055 6.1745 11.0697 6.13572L10.1874 5.17832C10.1482 5.13586 10.0814 5.13528 10.0415 5.17705L7.0957 8.26313C7.05662 8.30406 6.99139 8.30445 6.95184 8.26397L5.53293 6.81207C5.49338 6.7716 5.42815 6.77198 5.38908 6.81291L4.5083 7.73564C4.47141 7.77428 4.47141 7.83509 4.5083 7.87374L6.95187 10.4337Z"
        fill="url(#smart_verified_badge_grad)"
      />
      <defs>
        <linearGradient
          id="smart_verified_badge_grad"
          x1="2.78784"
          y1="2.30469"
          x2="10.2878"
          y2="15.8047"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#28C76D" />
          <stop offset="1" stopColor="#367438" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Brand SVG icons for social sharing
function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-7" {...props}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.18 8.18 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.08l-.29-.17-3.02.79.81-2.94-.19-.3a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 10.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 0.98-.15.17-.3.19-.55.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45s-.56-1.36-.77-1.86c-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31s-.88.86-.88 2.1c0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.3" />
    </svg>
  );
}

interface ProfileHeroBannerProps {
  user: AuthenticatedUser | undefined;
  education: CandidateEducationDto[];
  linkedinVerified: boolean;
  githubVerified: boolean;
  percent?: number | null;
  completedCount?: number | null;
  areaStatus?: Partial<Record<string, boolean>>;
  loading?: boolean;
}

const HERO_AVATAR_CLASS =
  'h-28 w-28 sm:h-32 sm:w-32 shrink-0 rounded-full border-2 border-zinc-100 bg-zinc-100 text-3xl font-extrabold text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-white';

const VERIFIED_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';

export function ProfileHeroBanner({
  user,
  education,
  linkedinVerified,
  githubVerified,
  loading: _loading = false,
}: ProfileHeroBannerProps) {
  const collegeName = primaryInstitutionName(education, user);
  const departmentName = primaryDepartmentName(education);
  const batchLabel = primaryBatchLabel(education);
  const hasEducation = education.length > 0;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullName = user?.fullName?.trim() || 'Candidate';
  const handle =
    user?.email?.split('@')[0]?.toLowerCase() ||
    fullName.toLowerCase().replace(/\s+/g, '') ||
    'edd';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3004';
  const shareUrl = `${origin}/@${handle}`;

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  return (
    <section
      aria-label="Profile summary"
      data-testid="profile-hero-banner"
      className="w-full font-sans select-none"
    >
      <div className="bg-white p-4 sm:p-6 dark:bg-[#161616]">
        {/* Profile Avatar Photo */}
        <div className="relative flex items-center shrink-0">
          <ProfilePhotoEditControl
            fullName={user?.fullName}
            profilePhotoUrl={user?.profilePhotoUrl}
            avatarClassName={HERO_AVATAR_CLASS}
            fallbackClassName="rounded-full bg-zinc-900 text-3xl font-extrabold text-white dark:bg-white dark:text-zinc-900"
          />
        </div>

        {/* Candidate Details */}
        <div className="mt-5 space-y-2 text-left">
          {/* Name Row: Name + Badges on Left, Share & Edit Buttons STRAIGHT OPPOSITE on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Name & Official Verified Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-medium text-2xl sm:text-3xl   text-zinc-950 dark:text-white">
                {fullName}
              </h1>
              {/* Official SMART 16-point scalloped verified badge */}
              <SmartVerifiedBadge />

              {linkedinVerified && (
                <span className={VERIFIED_BADGE_CLASS}>
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  LinkedIn Verified
                </span>
              )}
              {githubVerified && (
                <span className={VERIFIED_BADGE_CLASS}>
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  GitHub Verified
                </span>
              )}
            </div>

            {/* Right (Straight opposite to Name): Share & Edit Profile Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Share Profile Button */}
              <button
                type="button"
                onClick={handleShareClick}
                aria-label="Share profile"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <Share2 className="size-4 text-zinc-600 dark:text-zinc-300" />
                Share
              </button>

              {/* Edit Profile Button */}
              <Link
                href="/profile?section=experience"
                className="inline-flex items-center justify-center rounded-md bg-[#000000] px-5 py-2 text-sm font-medium text-white shadow-2xs transition-all hover:bg-[#00382a] active:scale-[0.99] dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Username Handle */}
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">@{handle}</p>

          {/* Tagline / Bio Quote */}
          <p className="text-xs sm:text-sm font-normal text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
            &ldquo;Motivated student eager to explore new opportunities and apply my skills in a
            dynamic environment.&rdquo;
          </p>

          {/* Department */}
          {departmentName ? (
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {departmentName}
            </p>
          ) : hasEducation ? (
            <p className="text-xs text-zinc-400">Department not added yet</p>
          ) : null}

          {/* Experience, Batch & College Info */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
              <Briefcase className="size-3.5 text-zinc-400" />0 years of experience
            </span>

            {batchLabel && (
              <span className="inline-flex items-center gap-1 font-semibold text-zinc-600 dark:text-zinc-300">
                <GraduationCap className="size-3.5 text-zinc-400" />
                {batchLabel}
              </span>
            )}

            {collegeName && (
              <span className="inline-flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-300">
                <Building2 className="size-3.5 text-zinc-400" />
                {collegeName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Light Theme YouTube-Style Share Profile Modal Popup */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-[#161616] text-left">
            {/* Modal Header with Official SMART Verified Logo */}
            <div className="relative flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <SmartVerifiedBadge className="size-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  SMART Verified Profile
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Main Title */}
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-4 mb-3">
              Share
            </h3>

            {/* Circular Social Share Icon Row (WhatsApp, LinkedIn, Email) */}
            <div className="flex items-center justify-start gap-6 py-1 overflow-x-auto">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${fullName}'s verified candidate profile: ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md group-hover:scale-105 transition-transform">
                  <WhatsAppIcon />
                </div>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  WhatsApp
                </span>
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-md group-hover:scale-105 transition-transform">
                  <LinkedInIcon />
                </div>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  LinkedIn
                </span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`${fullName}'s Verified Profile`)}&body=${encodeURIComponent(`View the verified candidate profile: ${shareUrl}`)}`}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-[#EA4335] text-white shadow-md group-hover:scale-105 transition-transform">
                  <Mail className="size-6" />
                </div>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Email</span>
              </a>
            </div>

            {/* Bottom URL Box with Copy Button */}
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-zinc-50 p-2 pl-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <span className="truncate text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 select-all">
                {shareUrl}
              </span>
              <button
                type="button"
                onClick={() => void copyLinkToClipboard()}
                className="shrink-0 rounded-full bg-zinc-950 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition-all dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
