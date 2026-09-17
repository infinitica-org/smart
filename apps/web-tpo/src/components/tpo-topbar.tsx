'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Menu, X, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, SmartLogo } from '@smart/ui';
import type { AuthenticatedUser, InstitutionStudentDto, JobOpeningDto } from '@smart/contracts';
import { api, openingsApi } from '../lib/api';
import { signOut } from '../lib/auth';
import { TPO_NAV, isNavItemActive, isPlacementTopNavActive } from '../lib/tpo-nav';
import { sectionLabelClass } from '../lib/tpo-ui';

const ROLE_LABELS: Record<string, string> = {
  INSTITUTION_ADMIN: 'Institution Admin',
  PLACEMENT_STAFF: 'Placement Officer',
};

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_CHARS = 2;

export function TpoTopbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      .catch(() => {
        /* degrades gracefully */
      });
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
    setMobileMenuOpen(false);
  }

  const hasResults = candidateResults.length > 0 || openingResults.length > 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 font-sans text-[var(--ds-text)] lg:px-8">
      {/* Brand / Logo */}
      <div className="flex items-center gap-6 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <SmartLogo
            kind="wordmark"
            tone="on-light"
            className="h-6 w-auto group-hover:opacity-90 transition-opacity"
            title="SMART"
          />
          <span className="hidden sm:inline-block rounded-md border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] px-2 py-0.5 text-[10px] font-bold text-[var(--ds-text)]">
            PRO
          </span>
        </Link>

        {/* Desktop Navbar Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {TPO_NAV.map((item) => {
            const isActive =
              item.kind === 'link' && item.name === 'Placement'
                ? isPlacementTopNavActive(pathname)
                : isNavItemActive(pathname, item);
            const itemClassName = `flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] ${
              isActive
                ? 'border-[var(--tpo-accent-border)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-text)]'
                : 'border-transparent text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]'
            }`;

            if (item.kind === 'group') {
              return null;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={itemClassName}
              >
                <span>{item.name}</span>
                {item.isNew && (
                  <span className="bg-emerald-500 text-zinc-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-3">
        {/* Working Search Form */}
        <div ref={searchBoxRef} className="hidden md:flex relative group">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ds-text-subtle)] transition-colors group-focus-within:text-[var(--ds-text-secondary)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => hasResults && setSearchOpen(true)}
              placeholder="Search candidates, JDs..."
              className="w-56 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] py-2 pl-9 pr-12 text-xs font-medium text-[var(--ds-text)] transition-all placeholder:text-[var(--ds-text-subtle)] focus:border-[var(--tpo-accent-border)] focus:bg-[var(--ds-surface)] focus:outline-none lg:w-64"
            />
            <div className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center lg:flex">
              <kbd className="rounded border border-[var(--ds-border)] bg-[var(--ds-surface)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ds-text-muted)]">
                ⌘K
              </kbd>
            </div>
          </form>

          {searchOpen && query.trim().length >= MIN_SEARCH_CHARS && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1.5 text-[var(--ds-text)] shadow-lg">
              {searching ? (
                <p className="p-4 text-xs font-medium text-[var(--ds-text-muted)]">Searching…</p>
              ) : !hasResults ? (
                <p className="p-4 text-xs font-medium text-[var(--ds-text-muted)]">
                  No matches for &quot;{query}&quot;. Press Enter to view search roster.
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
                          className="flex w-full items-center justify-between truncate rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-surface-hover)]"
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
                          onClick={() => goTo('/placements')}
                          className="flex w-full items-center justify-between truncate rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-surface-hover)]"
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

        <div className="mx-1 hidden h-5 w-px bg-[var(--ds-border)] md:block"></div>

        {/* User Profile */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="group flex items-center gap-2.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 pl-3 transition-all hover:bg-[var(--ds-surface-hover)]"
          >
            <div className="hidden flex-col items-end text-right sm:flex">
              <span className="text-xs font-bold leading-tight text-[var(--ds-text)]">
                {user?.fullName ?? 'Pilot TPO'}
              </span>
              <span className="text-[10px] font-medium leading-tight text-[var(--ds-text-muted)]">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : 'Institution Admin'}
              </span>
            </div>
            <Avatar className="flex size-7.5 items-center justify-center rounded-lg border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] text-xs font-bold text-[var(--ds-text)]">
              <AvatarFallback className="bg-[var(--tpo-accent-tint)] text-xs font-bold text-[var(--ds-text)]">
                {(user?.fullName?.charAt(0) ?? 'P').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 text-[var(--ds-text)] shadow-lg">
              <div className="border-b border-[var(--ds-border-subtle)] px-3 py-2.5">
                <p className="truncate text-xs font-bold text-[var(--ds-text)]">
                  {user?.fullName ?? 'Pilot TPO'}
                </p>
                <p className="truncate text-[11px] text-[var(--ds-text-muted)]">
                  {user?.email ?? 'tpo@institution.edu'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--ds-coral)] transition-colors hover:bg-[#fef4f4]"
              >
                <LogOut strokeWidth={1.75} className="size-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] p-2 text-[var(--ds-text-secondary)] transition-colors hover:text-[var(--ds-text)] xl:hidden"
        >
          {mobileMenuOpen ? (
            <X strokeWidth={1.75} className="size-5" />
          ) : (
            <Menu strokeWidth={1.75} className="size-5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="absolute left-0 top-full z-50 flex w-full flex-col gap-2 border-b border-[var(--ds-border)] bg-[var(--ds-surface)] p-4 shadow-lg xl:hidden">
          {TPO_NAV.map((item) => {
            const isActive = isNavItemActive(pathname, item);
            const iconClass = isActive
              ? 'size-4 text-[var(--ds-text)]'
              : 'size-4 text-[var(--ds-text-muted)]';
            const rowClass = (active: boolean) =>
              `rounded-lg border px-3.5 py-2.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-[var(--tpo-accent-border)] bg-[var(--ds-nav-active-bg)] font-semibold text-[var(--ds-text)]'
                  : 'border-transparent text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]'
              }`;

            if (item.kind === 'group') {
              return null;
            }

            const linkActive =
              item.name === 'Placement' ? isPlacementTopNavActive(pathname) : isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={linkActive ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between ${rowClass(linkActive)}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon strokeWidth={1.75} className={iconClass} />
                  <span>{item.name}</span>
                </div>
                {item.isNew && (
                  <span className="rounded-md bg-[var(--tpo-accent)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--ds-text)]">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
