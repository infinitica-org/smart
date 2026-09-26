'use client';

import type { ReactNode } from 'react';
import { SmartLogo } from './smart-logo';

export interface BrandLoadingScreenProps {
  message?: ReactNode;
  className?: string;
}

export function BrandLoadingScreen({
  message = 'Waking up your dashboard…',
  className = '',
}: BrandLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-screen w-full flex-col items-center justify-center bg-[#f4f5f6] px-4 text-center select-none ${className}`}
    >
      {/* Outer Soft Glow Circle container */}
      <div className="relative flex items-center justify-center">
        {/* Layer 1: Ambient Outer Pulse Glow */}
        <div
          className="absolute -inset-2 rounded-full bg-emerald-300/30 blur-2xl animate-pulse"
          aria-hidden="true"
        />

        {/* Layer 2: Soft Mint/Teal Gradient Circle (Matching Image 2) */}
        <div className="relative flex size-56 sm:size-64 items-center justify-center rounded-full bg-gradient-to-br from-[#e4f3ef] via-[#e2f1ed] to-[#d8f3ec] shadow-sm shadow-emerald-500/5">
          {/* SMART wordmark logo in solid dark tone */}
          <SmartLogo kind="text" tone="on-light" className="h-9 sm:h-11 w-auto" />
        </div>
      </div>

      {/* Message Text below the circle */}
      <div className="mt-8 text-base sm:text-lg font-normal tracking-tight text-[#4b5563]">
        {message}
      </div>
    </div>
  );
}
