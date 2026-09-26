'use client';

import { useState } from 'react';
import { ExternalLink, Link2, Share2, Copy, Check } from 'lucide-react';
import { useQuery } from '@smart/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/lib/candidate-identity';

export function ProfilePublicLinkCard() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const { data: user } = useCurrentUser();

  const { data: link, isLoading: _isLoading } = useQuery({
    queryKey: ['me', 'public-profile-link'] as const,
    queryFn: () => api.users.getPublicProfileLink(),
    staleTime: 60_000,
  });

  const handle =
    user?.email?.split('@')[0]?.toLowerCase() ||
    user?.fullName?.toLowerCase().replace(/\s+/g, '') ||
    'edd';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3004';
  const effectiveUrl = link?.url || `${origin}/@${handle}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    window.setTimeout(() => setCopyState('idle'), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My SMART verified profile', url: effectiveUrl });
        return;
      } catch {
        // dismissed
      }
    }
    void copyLink();
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-zinc-200/90 bg-white px-5 py-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-[#161616] font-sans select-none">
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <Link2
            className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
            Public Credential Link
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500 font-normal">
          {effectiveUrl}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href={link?.url || '/public-profile'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Preview
        </Link>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 active:scale-95 transition-all dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
        >
          {copyState === 'copied' ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy Link
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => void shareLink()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <Share2 className="size-3.5" aria-hidden="true" />
          Share
        </button>
      </div>
    </div>
  );
}
