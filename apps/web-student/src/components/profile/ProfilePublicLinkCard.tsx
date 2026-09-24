'use client';

import { useState } from 'react';
import { ExternalLink, Link2, Share2, Copy, Check } from 'lucide-react';
import { useQuery } from '@smart/ui';
import Link from 'next/link';
import { api } from '@/lib/api';

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
        await navigator.share({ title: 'My SMART verified profile', url: link.url });
        return;
      } catch {
        // dismissed
      }
    }
    void copyLink();
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-[#161616] font-sans select-none">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
          <Link2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          Public Credential Link
        </p>
        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {isLoading
            ? 'Loading your shareable credential link…'
            : link?.url
              ? link.url
              : 'Publicly shareable profile credential with cryptographic verification stamp.'}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href="/public-profile"
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Preview
        </Link>
        {link?.url ? (
          <>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
