'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingState, MessagesWorkspace } from '@smart/ui';
import { PageHeader } from '../../../components/ui';
import { pageStack } from '../../../lib/ui';

function MessagesContent() {
  const params = useSearchParams();
  return <MessagesWorkspace initialConversationId={params.get('conversation')} />;
}

/** COM-01 — conversations with candidates (Th6-422 to Th6-427). Start one from a candidate's panel. */
export default function MessagesPage() {
  return (
    <div className={pageStack}>
      <PageHeader
        title="Messages"
        description="Conversations with candidates. Start a new one from an applicant's profile."
      />
      <Suspense fallback={<LoadingState message="Loading messages…" />}>
        <MessagesContent />
      </Suspense>
    </div>
  );
}
