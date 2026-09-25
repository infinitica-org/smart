'use client';

import { useState } from 'react';
import { StartConversationDialog } from '@smart/ui';
import { MessagingProvider } from './messaging-provider';

/**
 * Th6-423 — "Message student" on the advisor's student view. The dialog (and the API client it needs) is
 * only mounted once the button is pressed. The API decides whether the student is in this advisor's scope.
 */
export function MessageStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-2xs transition-all hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        Message
      </button>
      {open ? (
        <MessagingProvider>
          <StartConversationDialog
            open
            onClose={() => setOpen(false)}
            target={{ recipientId: studentId }}
            recipientName={studentName}
            onStarted={(conversationId) =>
              window.location.assign(`/messages?conversation=${conversationId}`)
            }
          />
        </MessagingProvider>
      ) : null}
    </>
  );
}
