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
    <header className="h-[66px] flex items-center justify-between px-8 bg-[#0a0a0a] border-b border-white/5 text-white shrink-0 font-sans">
      {/* Left side: Breadcrumbs / Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-md font-medium text-gray-500">
          <span>SMART</span>
          <ChevronRight className="w-3 h-3" />
          <span>Academia</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">{title}</span>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div ref={searchBoxRef} className="hidden md:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00fad0] transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => hasResults && setSearchOpen(true)}
            placeholder="Search candidates, JDs..."
            className="w-[280px] bg-[#131313] text-white text-sm rounded-full py-2 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 focus:bg-[#161616] placeholder-gray-600 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex">
            <span className="text-[10px] text-gray-600 border border-gray-700/50 rounded px-1.5 py-0.5">
              ⌘K
            </span>
          </div>

          {searchOpen && query.trim().length >= MIN_SEARCH_CHARS && (
            <div className="absolute top-full mt-2 left-0 w-[340px] rounded-xl border border-white/10 bg-[#131313] shadow-2xl overflow-hidden z-50">
              {searching ? (
                <p className="p-4 text-sm text-gray-400">Searching…</p>
              ) : !hasResults ? (
                <p className="p-4 text-sm text-gray-400">No matches for &quot;{query}&quot;.</p>
              ) : (
                <>
                  {candidateResults.length > 0 && (
                    <div className="py-2">
                      <p className="px-4 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
                        Candidates
                      </p>
                      {candidateResults.map((candidate) => (
                        <button
                          key={candidate.userId}
                          type="button"
                          onClick={() => goTo('/students')}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white truncate"
                        >
                          {candidate.fullName}{' '}
                          <span className="text-gray-500">{candidate.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {openingResults.length > 0 && (
                    <div className="py-2 border-t border-white/5">
                      <p className="px-4 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
                        Job openings
                      </p>
                      {openingResults.map((opening) => (
                        <button
                          key={opening.openingId}
                          type="button"
                          onClick={() => goTo('/placements')}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white truncate"
                        >
                          {opening.roleTitle}{' '}
                          <span className="text-gray-500">{opening.companyName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-white/10 hidden md:block"></div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Bell className="w-5 h-5" />
        </button>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 border-l border-white/5"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-white">{user?.fullName ?? ' '}</span>
              <span className="text-xs text-gray-500">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : ''}
              </span>
            </div>
            <Avatar className="w-9 h-9 border-2 border-transparent hover:border-white/10 transition-colors">
              <AvatarFallback>{(user?.fullName.charAt(0) ?? 'T').toUpperCase()}</AvatarFallback>
            </Avatar>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#131313] shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors">
          <MenuIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
