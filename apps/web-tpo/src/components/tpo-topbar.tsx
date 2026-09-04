'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, MenuIcon, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@smart/ui';
import type { AuthenticatedUser, InstitutionStudentDto, JobOpeningDto } from '@smart/contracts';
import { api, openingsApi } from '../lib/api';
import { signOut } from '../lib/auth';

function getBreadcrumb(pathname: string) {
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
  const path = pathname.split('/')[1];
  if (!path) return 'Dashboard';
  return path.charAt(0).toUpperCase() + path.slice(1);
}

const ROLE_LABELS: Record<string, string> = {
  INSTITUTION_ADMIN: 'Institution Admin',
  PLACEMENT_STAFF: 'Placement Officer',
};

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_CHARS = 2;

export function TpoTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = getBreadcrumb(pathname);

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
      .catch(() => {
        /* topbar degrades to a generic label if this fails */
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
      if (event.key === 'Escape') setSearchOpen(false);
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

  function goTo(path: string) {
    router.push(path);
    setSearchOpen(false);
    setQuery('');
  }

  const hasResults = candidateResults.length > 0 || openingResults.length > 0;

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 shrink-0 font-sans sticky top-0 z-30 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
      {/* Left side: Breadcrumbs / Title */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span
          className="text-slate-400 font-semibold tracking-tight hover:text-slate-700 transition-colors cursor-pointer"
          onClick={() => router.push('/')}
        >
          SMART
        </span>
        <ChevronRight className="size-3.5 text-slate-300 stroke-[2.5]" />
        <span className="text-slate-400 font-semibold tracking-tight">Academia</span>
        <ChevronRight className="size-3.5 text-slate-300 stroke-[2.5]" />
        <span className="text-slate-900 font-bold text-sm tracking-tight">{title}</span>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div ref={searchBoxRef} className="hidden md:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-[#004c63] transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => hasResults && setSearchOpen(true)}
            placeholder="Search candidates, JDs..."
            className="w-64 lg:w-72 bg-slate-100/80 text-slate-900 text-xs rounded-xl py-2 pl-9 pr-12 border border-slate-200/80 focus:outline-none focus:border-[#004c63] focus:bg-white focus:ring-2 focus:ring-[#004c63]/15 placeholder:text-slate-400 transition-all font-medium"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold font-mono text-slate-400 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
              ⌘K
            </kbd>
          </div>

          {searchOpen && query.trim().length >= MIN_SEARCH_CHARS && (
            <div className="absolute top-full mt-2 right-0 w-[360px] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden z-50 p-1.5">
              {searching ? (
                <p className="p-4 text-xs text-slate-500 font-medium">Searching…</p>
              ) : !hasResults ? (
                <p className="p-4 text-xs text-slate-500 font-medium">
                  No matches for &quot;{query}&quot;.
                </p>
              ) : (
                <>
                  {candidateResults.length > 0 && (
                    <div className="py-1">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Candidates
                      </p>
                      {candidateResults.map((candidate) => (
                        <button
                          key={candidate.userId}
                          type="button"
                          onClick={() => goTo('/students')}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/80 text-xs font-semibold text-slate-900 truncate flex items-center justify-between transition-colors"
                        >
                          <span>{candidate.fullName}</span>
                          <span className="text-slate-400 font-normal">{candidate.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {openingResults.length > 0 && (
                    <div className="py-1 border-t border-slate-100">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Job openings
                      </p>
                      {openingResults.map((opening) => (
                        <button
                          key={opening.openingId}
                          type="button"
                          onClick={() => goTo('/placements')}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/80 text-xs font-semibold text-slate-900 truncate flex items-center justify-between transition-colors"
                        >
                          <span>{opening.roleTitle}</span>
                          <span className="text-slate-400 font-normal">{opening.companyName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200/80 hidden md:block mx-1"></div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-xl hover:bg-slate-100/80"
        >
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-[#004c63] ring-2 ring-white"></span>
        </button>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200/60 group"
          >
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user?.fullName ?? 'Pilot TPO'}
              </span>
              <span className="text-[11px] font-medium text-slate-400 leading-tight">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : 'Institution Admin'}
              </span>
            </div>
            <Avatar className="size-8 rounded-full border border-slate-200/80 bg-[#004c63] text-white text-xs font-bold flex items-center justify-center shadow-xs">
              <AvatarFallback className="bg-[#004c63] text-white font-bold text-xs">
                {(user?.fullName?.charAt(0) ?? 'P').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="size-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl overflow-hidden z-50 p-1">
              <div className="px-3.5 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName ?? 'Pilot TPO'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email ?? 'tpo@institution.edu'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50/80 transition-colors mt-1"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          aria-label="Open menu"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <MenuIcon className="size-5" />
        </button>
      </div>
    </header>
  );
}
