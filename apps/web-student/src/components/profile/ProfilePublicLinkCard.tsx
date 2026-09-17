'use client';

import { useState } from 'react';
import { ExternalLink, Link2, Share2 } from 'lucide-react';
import { useQuery } from '@smart/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { profileSecondaryButtonSmClass } from '@/lib/profile-ui-classes';

export function ProfilePublicLinkCard() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const { data: link, isLoading } = useQuery({
    queryKey: ['me', 'public-profile-link'] as const,
    queryFn: () => api.users.getPublicProfileLink(),
    staleTime: 60_000,
  });

  const copyLink = async () => {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    window.setTimeout(() => setCopyState('idle'), 2000);
  };

  const shareLink = async () => {
    if (!link?.url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My SMART profile', url: link.url });
        return;
      } catch {
        // dismissed
      }
    }
    void copyLink();
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ds-text)]">
          <Link2 className="size-4 shrink-0 text-[var(--ds-green)]" aria-hidden="true" />
          Public profile link
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--ds-text-muted)]">
          {isLoading
            ? 'Loading your shareable link…'
            : link?.url
              ? link.url
              : 'Preview and manage visibility on your public profile page.'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link href="/public-profile" className={profileSecondaryButtonSmClass}>
          <ExternalLink className="size-3.5" aria-hidden="true" />
          View & settings
        </Link>
        {link?.url ? (
          <>
            <button
              type="button"
              onClick={() => void copyLink()}
              className={profileSecondaryButtonSmClass}
            >
              {copyState === 'copied'
                ? 'Copied'
                : copyState === 'error'
                  ? 'Copy failed'
                  : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => void shareLink()}
              className={profileSecondaryButtonSmClass}
            >
              <Share2 className="size-3.5" aria-hidden="true" />
              Share
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
