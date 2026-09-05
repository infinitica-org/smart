'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  UserPlus,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@smart/ui';
import type { AuthenticatedUser, InstitutionStudentDto, JobOpeningDto } from '@smart/contracts';
import { api, openingsApi } from '../lib/api';
import { signOut } from '../lib/auth';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  isNew?: boolean;
}

const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Candidates', href: '/students', icon: Users },
  { name: 'Onboarding', href: '/provisioning', icon: UserPlus },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

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
    <header className="h-16 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800 text-zinc-100 shrink-0 font-sans sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between shadow-md">
      {/* Brand / Logo */}
      <div className="flex items-center gap-6 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.svg"
            alt="SMART"
            width={96}
            height={24}
            className="h-5.5 w-auto brightness-0 invert group-hover:opacity-90 transition-opacity"
            priority
          />
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-white border border-zinc-700">
            PRO
          </span>
        </Link>

        {/* Desktop Navbar Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {mainNav.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 group-focus-within:text-white transition-colors pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => hasResults && setSearchOpen(true)}
              placeholder="Search candidates, JDs..."
              className="w-56 lg:w-64 bg-zinc-900 text-zinc-100 text-xs rounded-lg py-2 pl-9 pr-12 border border-zinc-800 focus:outline-none focus:border-zinc-600 font-medium placeholder:text-zinc-500 transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded">
                ⌘K
              </kbd>
            </div>
          </form>

          {searchOpen && query.trim().length >= MIN_SEARCH_CHARS && (
            <div className="absolute top-full mt-2 right-0 w-[360px] rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 p-1.5 text-zinc-100">
              {searching ? (
                <p className="p-4 text-xs text-zinc-400 font-medium">Searching…</p>
              ) : !hasResults ? (
                <p className="p-4 text-xs text-zinc-400 font-medium">
                  No matches for &quot;{query}&quot;. Press Enter to view search roster.
                </p>
              ) : (
                <>
                  {candidateResults.length > 0 && (
                    <div className="py-1">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Candidates
                      </p>
                      {candidateResults.map((candidate) => (
                        <button
                          key={candidate.userId}
                          type="button"
                          onClick={() =>
                            goTo(`/students?q=${encodeURIComponent(candidate.fullName)}`)
                          }
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-xs font-semibold text-zinc-100 truncate flex items-center justify-between transition-colors"
                        >
                          <span>{candidate.fullName}</span>
                          <span className="text-zinc-400 font-normal">{candidate.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {openingResults.length > 0 && (
                    <div className="py-1 border-t border-zinc-800">
                      <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Job openings
                      </p>
                      {openingResults.map((opening) => (
                        <button
                          key={opening.openingId}
                          type="button"
                          onClick={() => goTo('/placements')}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-xs font-semibold text-zinc-100 truncate flex items-center justify-between transition-colors"
                        >
                          <span>{opening.roleTitle}</span>
                          <span className="text-zinc-400 font-normal">{opening.companyName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-zinc-800 hidden md:block mx-1"></div>

        {/* User Profile */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2.5 p-1 pl-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group"
          >
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-bold text-white leading-tight">
                {user?.fullName ?? 'Pilot TPO'}
              </span>
              <span className="text-[10px] font-medium text-zinc-400 leading-tight">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : 'Institution Admin'}
              </span>
            </div>
            <Avatar className="size-7.5 rounded-lg border border-zinc-700 bg-zinc-800 text-white text-xs font-bold flex items-center justify-center">
              <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs">
                {(user?.fullName?.charAt(0) ?? 'P').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 p-1 text-zinc-100">
              <div className="px-3 py-2.5 border-b border-zinc-800">
                <p className="text-xs font-bold text-white truncate">
                  {user?.fullName ?? 'Pilot TPO'}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {user?.email ?? 'tpo@institution.edu'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors mt-1"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="xl:hidden p-2 text-zinc-400 hover:text-white transition-colors rounded-lg bg-zinc-900 border border-zinc-800"
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-zinc-950 border-b border-zinc-800 p-4 shadow-2xl xl:hidden z-50 flex flex-col gap-2">
          {mainNav.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="size-4 text-zinc-400" />
                  <span>{item.name}</span>
                </div>
                {item.isNew && (
                  <span className="bg-emerald-500 text-zinc-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
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
