'use client';

import type { ReactNode } from 'react';
import { SmartApiError } from '@smart/api-client';
import { useQuery, useSmartApi } from '../api-provider';

/** Th6-422 — client polling interval. TODO: replace polling with a socket subscription. */
export const MESSAGING_POLL_MS = 15_000;

export function messageErrorText(error: unknown): string {
  return error instanceof SmartApiError ? error.message : 'Something went wrong. Try again.';
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** Th6-426 — the total unread count for a nav badge. Returns 0 while loading or on error. */
export function useUnreadMessageCount(): number {
  const api = useSmartApi();
  const query = useQuery({
    queryKey: ['messaging', 'unread'],
    queryFn: () => api.messaging.unreadCount(),
    refetchInterval: MESSAGING_POLL_MS,
    retry: false,
  });
  return query.data?.count ?? 0;
}

/**
 * Message text is always rendered as React text (never as HTML), so a body such as `<img onerror=…>`
 * shows up literally. `whitespace-pre-wrap` keeps the sender's line breaks.
 */
export function MessageText({ text }: { text: string }) {
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

/** A search snippet is plain text with `<mark>…</mark>` around the matches; only those tags are honoured. */
export function SnippetText({ snippet }: { snippet: string }) {
  const parts: ReactNode[] = [];
  let highlighted = false;
  snippet.split(/(<mark>|<\/mark>)/).forEach((piece, index) => {
    if (piece === '<mark>') highlighted = true;
    else if (piece === '</mark>') highlighted = false;
    else if (piece) {
      parts.push(
        highlighted ? (
          <mark
            key={index}
            className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-700/60"
          >
            {piece}
          </mark>
        ) : (
          piece
        ),
      );
    }
  });
  return <span className="break-words">{parts}</span>;
}
