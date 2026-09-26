'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';

/** "Sam Rao" → "SR", "Acme" → "AC". Never empty: a nameless person shows "?". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return (words[0] ?? '').slice(0, 2).toUpperCase();
  return `${(words[0] ?? '').charAt(0)}${(words.at(-1) ?? '').charAt(0)}`.toUpperCase();
}

export interface ParticipantAvatarProps {
  name: string;
  /** A student photo or a company logo; anything falsy (or a broken link) falls back to initials. */
  avatarUrl?: string | null;
  className?: string;
}

/** Th6-424 — the other participant in a conversation: their image, or their initials. */
export function ParticipantAvatar({ name, avatarUrl, className }: ParticipantAvatarProps) {
  const [broken, setBroken] = useState(false);
  // A fresh link (the signed URL is re-minted on refetch) gets another chance.
  useEffect(() => setBroken(false), [avatarUrl]);

  const box = cn(
    'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs font-semibold dark:bg-neutral-800',
    className,
  );
  if (avatarUrl && !broken) {
    return (
      <span className={box}>
        {/* alt="" — the name is always next to it, so a screen reader need not say it twice. */}
        <img
          src={avatarUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }
  return (
    <span aria-hidden className={box}>
      {initialsOf(name)}
    </span>
  );
}
