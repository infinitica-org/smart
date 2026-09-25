'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingState, MessagesWorkspace } from '@smart/ui';
import { MessagingProvider } from '../../../components/messaging-provider';

function MessagesContent() {
  const params = useSearchParams();
  return <MessagesWorkspace initialConversationId={params.get('conversation')} />;
}

/** COM-01 — advisor conversations with students of the institution (Th6-422/423). */
export default function MessagesPage() {
  return (
    <MessagingProvider>
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Messages</h1>
          <p className="text-sm text-zinc-500">
            Start a conversation from the Students page. Students can reply and mute, but not block
            you.
          </p>
        </div>
        <Suspense fallback={<LoadingState message="Loading messages…" />}>
          <MessagesContent />
        </Suspense>
      </div>
    </MessagingProvider>
  );
}
