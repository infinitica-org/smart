'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Send, Paperclip, MessageSquare, Calendar, ExternalLink, Lock } from 'lucide-react';
import { cn } from '@smart/ui';

export type MessageFilter = 'All' | 'Unread' | 'Employers' | 'School';

export interface Conversation {
  id: string;
  sender: string;
  company: string;
  category: 'Employers' | 'School';
  avatar: string;
  relatedJob?: string;
  relatedJobLink?: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: 'me' | 'other';
  text: string;
  time: string;
  interviewSuggestion?: {
    date: string;
    time: string;
    link: string;
  };
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialRecipient = searchParams.get('recipient');
  const initialRole = searchParams.get('role');

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (initialRecipient) {
      return [
        {
          id: 'conv-dynamic',
          sender: initialRecipient,
          company: 'Campus Hiring Partner',
          category: 'Employers',
          avatar: initialRecipient.slice(0, 2).toUpperCase(),
          relatedJob: initialRole || 'Placement Drive Role',
          relatedJobLink: '/matches',
          lastMessage: `Application submitted for ${initialRole || 'Role'}. Awaiting recruiter response.`,
          time: 'Just now',
          unread: false,
          online: true,
        },
      ];
    }
    return [];
  });

  const [selectedId, setSelectedId] = useState<string>(() => conversations[0]?.id || '');
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(() => {
    const initialMap: Record<string, ChatMessage[]> = {};
    if (initialRecipient) {
      initialMap['conv-dynamic'] = [
        {
          id: 'm-init',
          senderId: 'other',
          text: `Hello! We received your verified application for ${initialRole || 'the role'}. We are currently reviewing your candidate credential profile.`,
          time: 'Just now',
        },
      ];
    }
    return initialMap;
  });

  const [inputMessage, setInputMessage] = useState('');
  const [allowCompanyMessages, setAllowCompanyMessages] = useState(true);

  useEffect(() => {
    if (initialRecipient && !conversations.some((c) => c.sender === initialRecipient)) {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        sender: initialRecipient,
        company: 'Campus Hiring Partner',
        category: 'Employers',
        avatar: initialRecipient.slice(0, 2).toUpperCase(),
        relatedJob: initialRole || 'Placement Drive Role',
        relatedJobLink: '/matches',
        lastMessage: `Application submitted for ${initialRole || 'Role'}.`,
        time: 'Just now',
        unread: false,
        online: true,
      };
      setConversations([newConv, ...conversations]);
      setSelectedId(newConv.id);
      setThreads((prev) => ({
        ...prev,
        [newConv.id]: [
          {
            id: `m-${Date.now()}`,
            senderId: 'other',
            text: `Hello! We received your verified application for ${initialRole || 'the role'}. We look forward to connecting with you.`,
            time: 'Just now',
          },
        ],
      }));
    }
  }, [initialRecipient, initialRole, conversations]);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const activeMessages = selectedConv ? threads[selectedConv.id] || [] : [];

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedConv) return;

    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      senderId: 'me',
      text: inputMessage.trim(),
      time: 'Just now',
    };

    setThreads((prev) => ({
      ...prev,
      [selectedConv.id]: [...(prev[selectedConv.id] || []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id ? { ...c, lastMessage: inputMessage.trim(), time: 'Just now' } : c,
      ),
    );

    setInputMessage('');
  };

  const handleSelectConv = (id: string) => {
    setSelectedId(id);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter === 'Unread' && !c.unread) return false;
      if (activeFilter === 'Employers' && c.category !== 'Employers') return false;
      if (activeFilter === 'School' && c.category !== 'School') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.sender.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [conversations, activeFilter, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-12 pt-2 font-sans select-none">
      {/* 🚀 Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
            <MessageSquare className="size-6 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
              Messages
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Direct discussions with verified campus employers, technical recruiters, and placement
              advisors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={allowCompanyMessages}
              onChange={(e) => setAllowCompanyMessages(e.target.checked)}
              className="accent-zinc-900"
            />
            <span>Allow companies to message me</span>
          </label>
        </div>
      </section>

      {/* 🚫 Blocked Company Messages Banner State */}
      {!allowCompanyMessages && (
        <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <Lock className="size-4 text-amber-600 shrink-0" />
          <span>
            You have disabled company reach-outs in your Settings. Hiring partners cannot initiate
            new messaging threads.
          </span>
        </div>
      )}

      {/* 💬 Messenger Workspace */}
      <div className="grid h-[640px] grid-cols-1 overflow-hidden rounded-md border border-zinc-200/80 bg-white shadow-2xs md:grid-cols-12 dark:border-zinc-800 dark:bg-[#161616]">
        {/* 📇 Left Panel */}
        <div className="flex flex-col border-b border-zinc-200/80 md:col-span-4 md:border-b-0 md:border-r dark:border-zinc-800">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full rounded-md border border-zinc-200 bg-zinc-50/70 py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5">
              {(['All', 'Unread', 'Employers', 'School'] as MessageFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    activeFilter === f
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-850">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                Messages from companies will appear here.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedConv?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConv(c.id)}
                    className={cn(
                      'flex w-full items-start gap-3 p-3.5 text-left transition-colors',
                      isSelected
                        ? 'bg-zinc-100/90 dark:bg-zinc-800/80'
                        : 'hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40',
                    )}
                  >
                    <div className="relative size-9 shrink-0 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center dark:bg-white dark:text-zinc-900">
                      {c.avatar}
                      {c.online && (
                        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold text-zinc-950 dark:text-white">
                          {c.sender}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0">{c.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {c.company}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 truncate">
                        {c.lastMessage}
                      </p>
                    </div>

                    {c.unread && <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 📬 Right Panel */}
        <div className="flex flex-col md:col-span-8">
          {selectedConv ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-200/80 px-5 py-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-white font-bold text-xs dark:bg-white dark:text-zinc-900">
                    {selectedConv.avatar}
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-bold text-zinc-950 dark:text-white">
                      {selectedConv.sender}
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {selectedConv.company}
                    </p>
                  </div>
                </div>

                {selectedConv.relatedJob && (
                  <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                    <span className="text-zinc-500 dark:text-zinc-400">Role:</span>
                    <Link
                      href={selectedConv.relatedJobLink || '/matches'}
                      className="font-bold text-zinc-900 hover:underline dark:text-white flex items-center gap-1"
                    >
                      {selectedConv.relatedJob}
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {activeMessages.map((msg) => {
                  const isMe = msg.senderId === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-md p-3.5 text-xs shadow-2xs leading-relaxed',
                          isMe
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                            : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
                        )}
                      >
                        <p>{msg.text}</p>

                        {msg.interviewSuggestion && (
                          <div className="mt-3 rounded-md border border-zinc-200/80 bg-white p-3 text-zinc-900 shadow-2xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                            <p className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                              <Calendar className="size-3.5" />
                              Interview Time Suggested
                            </p>
                            <p className="mt-1 font-semibold text-xs">
                              {msg.interviewSuggestion.date}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {msg.interviewSuggestion.time}
                            </p>
                            <a
                              href={msg.interviewSuggestion.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1 text-[11px] font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                            >
                              Join Video Call Link
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      <span className="mt-1 text-[10px] text-zinc-400 px-1">{msg.time}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-200/80 p-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    title="Attach file"
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                  >
                    <Paperclip className="size-4" />
                  </button>

                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message to recruiter..."
                    className="flex-1 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="inline-flex size-7 items-center justify-center rounded-md bg-zinc-900 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-xs text-zinc-400">
              <MessageSquare className="size-8 text-zinc-300 mb-2 dark:text-zinc-700" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                No conversation selected
              </p>
              <p className="mt-1 max-w-xs">
                When you accept an opportunity or receive a recruiter reach-out, message threads
                will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
