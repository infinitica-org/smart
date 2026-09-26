'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlockedUsersList } from '@smart/ui';

/** Th6-427 — Settings → Blocked users. */
export default function BlockedUsersPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pt-2 pb-16 font-sans">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to settings
      </Link>
      <header>
        <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
          Blocked users
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          People you block can&apos;t message you, and you can&apos;t message them.
        </p>
      </header>
      <BlockedUsersList />
    </div>
  );
}
