'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, GraduationCap, LogOut, Menu, Search, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback } from '@smart/ui';
import type { AuthenticatedUser, InstitutionStudentDto, JobOpeningDto } from '@smart/contracts';
import { api, openingsApi } from '../lib/api';
import { signOut } from '../lib/auth';
import {
  topbarFontClass,
  topbarSearchInputClass,
  topbarSeparatorClass,
} from '../lib/tpo-topbar-ui';
import { sectionLabelClass } from '../lib/tpo-ui';

const ROLE_LABELS: Record<string, string> = {
  INSTITUTION_ADMIN: 'Institution Admin',
  PLACEMENT_STAFF: 'Placement Officer',
};

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_CHARS = 2;

type TpoTopbarProps = {
  onOpenMobileNav: () => void;
};

export function TpoTopbar({ onOpenMobileNav }: TpoTopbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidateResults, setCandidateResults] = useState<InstitutionStudentDto[]>([]);
  const [openingResults, setOpeningResults] = useState<JobOpeningDto[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((res) => {
        if (!cancelled) setUser(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_SEARCH_CHARS) {
      setCandidateResults([]);
      setOpeningResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      Promise.all([
        api.onboarding.listTpoStudents({ q: term }).catch(() => []),
        openingsApi.list().catch(() => ({ openings: [] })),
      ])
        .then(([students, openingsRes]) => {
          const lower = term.toLowerCase();
          setCandidateResults(students.slice(0, 5));
          setOpeningResults(
            openingsRes.openings
              .filter(
                (opening) =>
                  opening.roleTitle.toLowerCase().includes(lower) ||
                  opening.companyName.toLowerCase().includes(lower),
              )
              .slice(0, 5),
          );
          setSearchOpen(true);
        })
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/students?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  }

  function goTo(path: string) {
    router.push(path);
    setSearchOpen(false);
    setQuery('');
  }

  const hasResults = candidateResults.length > 0 || openingResults.length > 0;

  return (
    <header
      className={`${topbarFontClass} fixed top-0 right-0 z-40 flex h-14 shrink-0 items-center border-b border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 text-[var(--ds-text)] antialiased lg:left-64 lg:px-6 left-0`}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
        className="mr-2 rounded-lg p-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-hover)] lg:hidden"
      >
        <Menu strokeWidth={1.5} className="size-[18px]" />
      </button>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 md:gap-0">
        <div ref={searchBoxRef} className="relative min-w-0 flex-1 md:flex-none">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center md:justify-end">
            <Search
              strokeWidth={1.5}
              className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-[var(--ds-text-subtle)]"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => hasResults && setSearchOpen(true)}
              placeholder="Search..."
              className={`${topbarSearchInputClass} w-full max-w-none pl-8 md:w-48 lg:w-56`}
            />
            <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center lg:flex">
              <kbd className="rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] px-1 py-px font-mono text-[9px] font-medium text-[var(--ds-text-subtle)]">
                ⌘K
              </kbd>
            </div>
          </form>

          {searchOpen && query.trim().length >= MIN_SEARCH_CHARS && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1.5 shadow-[var(--ds-card-shadow)]">
              {searching ? (
                <p className="p-4 text-xs font-medium text-[var(--ds-text-muted)]">Searching…</p>
              ) : !hasResults ? (
                <p className="p-4 text-xs font-medium text-[var(--ds-text-muted)]">
                  No matches. Press Enter to view full roster.
                </p>
              ) : (
                <>
                  {candidateResults.length > 0 && (
                    <div className="py-1">
                      <p className={`px-3 py-1.5 ${sectionLabelClass}`}>Candidates</p>
                      {candidateResults.map((candidate) => (
                        <button
                          key={candidate.userId}
                          type="button"
                          onClick={() =>
                            goTo(`/students?q=${encodeURIComponent(candidate.fullName)}`)
                          }
                          className="flex w-full items-center justify-between truncate rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--ds-surface-hover)]"
                        >
                          <span>{candidate.fullName}</span>
                          <span className="font-normal text-[var(--ds-text-muted)]">
                            {candidate.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {openingResults.length > 0 && (
                    <div className="border-t border-[var(--ds-border-subtle)] py-1">
                      <p className={`px-3 py-1.5 ${sectionLabelClass}`}>Job openings</p>
                      {openingResults.map((opening) => (
                        <button
                          key={opening.openingId}
                          type="button"
                          onClick={() => goTo('/companies')}
                          className="flex w-full items-center justify-between truncate rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--ds-surface-hover)]"
                        >
                          <span>{opening.roleTitle}</span>
                          <span className="font-normal text-[var(--ds-text-muted)]">
                            {opening.companyName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className={`${topbarSeparatorClass} hidden md:block`} aria-hidden />

        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-label={`${user?.fullName ?? 'Pilot TPO'} account menu`}
            className="flex max-w-[220px] items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-[var(--ds-surface-hover)]"
          >
            <Avatar className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
              <AvatarFallback className="rounded-full bg-transparent text-xs font-semibold text-[var(--ds-text-secondary)]">
                {(user?.fullName?.charAt(0) ?? 'P').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 flex-col items-start text-left lg:flex">
              <span className="truncate text-[12px] font-semibold leading-tight">
                {user?.fullName ?? 'Pilot TPO'}
              </span>
              <span className="truncate text-[10px] font-medium leading-tight text-[var(--ds-text-muted)]">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : 'Institution Admin'}
              </span>
            </div>
            <ChevronDown
              strokeWidth={1.5}
              className="hidden size-4 shrink-0 text-[var(--ds-text-subtle)] lg:block"
              aria-hidden
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 shadow-[var(--ds-card-shadow)]">
              <div className="border-b border-[var(--ds-border-subtle)] px-3 py-2.5">
                <p className="truncate text-xs font-semibold">{user?.fullName ?? 'Pilot TPO'}</p>
                <p className="truncate text-[11px] text-[var(--ds-text-muted)]">
                  {user?.email ?? 'tpo@institution.edu'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push('/settings');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--ds-surface-hover)]"
              >
                <UserRound strokeWidth={1.5} className="size-3.5" />
                My profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push('/school-profile');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--ds-surface-hover)]"
              >
                <GraduationCap strokeWidth={1.5} className="size-3.5" />
                My school
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--ds-coral)] hover:bg-[#fef4f4]"
              >
                <LogOut strokeWidth={1.5} className="size-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
