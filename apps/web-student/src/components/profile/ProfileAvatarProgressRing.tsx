'use client';

import type { ReactNode } from 'react';

const RING_SIZE = 120;
const STROKE_WIDTH = 4;

interface ProfileAvatarProgressRingProps {
  percent: number;
  children: ReactNode;
  loading?: boolean;
}

export function ProfileAvatarProgressRing({
  percent,
  children,
  loading = false,
}: ProfileAvatarProgressRingProps) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const radius = (RING_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safePercent / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safePercent}
      aria-label="Profile completion"
      data-testid="profile-avatar-progress-ring"
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--ds-progress-track)"
          strokeWidth={STROKE_WIDTH}
        />
        {!loading ? (
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            fill="none"
            stroke="var(--ds-green)"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        ) : null}
      </svg>
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  );
}
