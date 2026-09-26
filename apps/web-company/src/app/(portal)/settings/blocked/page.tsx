'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlockedUsersList } from '@smart/ui';
import { PageHeader } from '../../../../components/ui';
import { pageStack } from '../../../../lib/ui';

/** Th6-427 — Settings → Blocked users. */
export default function BlockedUsersPage() {
  return (
    <div className={pageStack}>
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to settings
      </Link>
      <PageHeader
        title="Blocked users"
        description="People you block cannot message you, and you cannot message them."
      />
      <BlockedUsersList />
    </div>
  );
}
