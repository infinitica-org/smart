'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { MessageSquare, Search, Send, Users } from 'lucide-react';
import { PageHeader } from '../../../components/ui';
import type { Conversation, Message } from '../../../lib/types';
import { input, pageStack, primaryButton, secondaryButton } from '../../../lib/ui';

function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-yellow-200 px-0.5 text-[var(--ds-text)]">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');

  const active = conversations.find((c) => c.id === activeId) || null;
  const trimmed = query.trim();

  const hits = useMemo(() => {
    if (!trimmed) return [];
    const needle = trimmed.toLowerCase();
    return conversations.flatMap((c) =>
      c.messages
        .filter((m) => m.text.toLowerCase().includes(needle))
        .map((m, i) => ({ key: `${c.id}-${i}`, conversation: c, text: m.text })),
    );
  }, [conversations, trimmed]);

  function send() {
    const text = draft.trim();
    if (!text || !activeId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [...c.messages, { from: 'me', text }] } : c,
      ),
    );
    setDraft('');
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title="Messages"
        description="Direct communication with verified candidates and applicant inquiries."
        actions={
          <Link href="/students" className={secondaryButton}>
            <Users className="size-4" />
            Reach out to candidates
          </Link>
        }
      />

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-[var(--ds-border)] bg-white p-16 text-center shadow-[var(--ds-card-shadow)]">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 mb-4">
            <MessageSquare className="size-7" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--ds-text)]">No conversations yet</h2>
          <p className="mt-1.5 max-w-md text-[13px] text-[var(--ds-text-muted)] leading-relaxed">
            When you find high-trust students or applicants in the search directory, you can
            initiate a conversation directly from their profile.
          </p>
          <div className="mt-5 flex gap-3">
            <Link href="/students" className={primaryButton}>
              Search candidates
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[520px] grid-cols-1 overflow-hidden rounded-[20px] border border-[var(--ds-border)] bg-white shadow-[var(--ds-card-shadow)] md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex flex-col border-b border-[var(--ds-border)] md:border-b-0 md:border-r">
            <div className="border-b border-[var(--ds-border-subtle)] p-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-subtle)]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search messages"
                  aria-label="Search messages"
                  className={`${input} pl-9`}
                />
              </div>
            </div>

            {trimmed ? (
              <ul
                className="flex-1 divide-y divide-[var(--ds-border-subtle)] overflow-y-auto"
                aria-label="Search results"
              >
                {hits.length === 0 ? (
                  <li className="px-4 py-8 text-center text-[13px] text-[var(--ds-text-muted)]">
                    No messages match “{trimmed}”
                  </li>
                ) : (
                  hits.map((hit) => (
                    <li key={hit.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(hit.conversation.id);
                          setQuery('');
                        }}
                        className="block w-full px-4 py-3 text-left hover:bg-[var(--ds-surface-hover)]"
                      >
                        <span className="block text-[13px] font-semibold text-[var(--ds-text)]">
                          {hit.conversation.name}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[var(--ds-text-secondary)]">
                          {highlight(hit.text, trimmed)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <ul
                className="flex-1 divide-y divide-[var(--ds-border-subtle)] overflow-y-auto"
                aria-label="Conversations"
              >
                {conversations.map((c) => {
                  const last = c.messages[c.messages.length - 1];
                  const isActive = c.id === activeId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => setActiveId(c.id)}
                        className={`block w-full px-4 py-3 text-left transition-colors ${
                          isActive
                            ? 'bg-[var(--ds-surface-muted)]'
                            : 'hover:bg-[var(--ds-surface-hover)]'
                        }`}
                      >
                        <span className="block text-[13px] font-semibold text-[var(--ds-text)]">
                          {c.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[var(--ds-text-muted)]">
                          {last?.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex min-h-[420px] flex-col">
            {active ? (
              <>
                <div className="border-b border-[var(--ds-border-subtle)] px-5 py-3.5">
                  <p className="text-[13px] font-semibold text-[var(--ds-text)]">
                    {active.name} — {active.job}
                  </p>
                </div>
                <ol
                  className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-5"
                  aria-label="Message thread"
                >
                  {active.messages.map((m, i) => (
                    <li
                      key={i}
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.from === 'me'
                          ? 'self-end bg-[var(--co-primary)] text-white'
                          : 'self-start border border-[var(--ds-border)] bg-white text-[var(--ds-text)]'
                      }`}
                    >
                      {m.text}
                    </li>
                  ))}
                </ol>
                <form
                  className="flex items-center gap-2 border-t border-[var(--ds-border-subtle)] p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    send();
                  }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    aria-label="Type a message"
                    className={input}
                  />
                  <button
                    type="submit"
                    disabled={draft.trim().length === 0}
                    className={primaryButton}
                  >
                    <Send className="size-4" aria-hidden /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[var(--ds-text-muted)]">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
