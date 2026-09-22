'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Shield, Building } from 'lucide-react';
import type { UserRole } from '../navigation/role-nav-config';

export interface UserMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: UserRole | string;
    organizationName?: string | null;
  } | null;
  onSignOut?: () => void;
  className?: string;
}

function roleBadgeLabel(role?: string): string {
  if (!role) return 'User';
  switch (role) {
    case 'SUPER_ADMIN':
    case 'SYSTEM_ADMIN':
      return 'Super Admin';
    case 'INSTITUTION_ADMIN':
    case 'TPO_ADMIN':
      return 'Institution Admin';
    case 'COMPANY_ADMIN':
    case 'RECRUITER':
      return 'Employer Recruiter';
    case 'STUDENT':
    case 'CANDIDATE':
      return 'Student';
    default:
      return role;
  }
}

export function UserMenu({ user, onSignOut, className = '' }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const name = user?.name || user?.email?.split('@')[0] || 'Authenticated User';
  const roleLabel = roleBadgeLabel(user?.role);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-1 pr-3 text-left transition-colors duration-150 hover:border-[var(--ds-border-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`User menu for ${name}`}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={name}
            className="size-8 rounded-full object-cover ring-1 ring-[var(--ds-border)]"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ds-primary-soft)] text-xs font-semibold text-[var(--ds-primary)]">
            {initials}
          </span>
        )}
        <div className="hidden text-xs sm:block">
          <p className="font-semibold text-[var(--ds-text)] leading-tight">{name}</p>
          <p className="text-[11px] text-[var(--ds-text-muted)] leading-tight">{roleLabel}</p>
        </div>
        <ChevronDown className="size-3.5 text-[var(--ds-text-muted)]" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User Account Options"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-2 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
        >
          <div className="border-b border-[var(--ds-border-subtle)] px-3 py-2.5">
            <p className="text-xs font-semibold text-[var(--ds-text)]">{name}</p>
            {user?.email ? (
              <p className="text-[11px] text-[var(--ds-text-muted)] truncate">{user.email}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ds-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ds-primary)]">
                <Shield className="size-3" aria-hidden />
                {roleLabel}
              </span>
              {user?.organizationName ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ds-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--ds-text-muted)] truncate max-w-[120px]">
                  <Building className="size-3" aria-hidden />
                  {user.organizationName}
                </span>
              ) : null}
            </div>
          </div>

          <div className="py-1" role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSignOut?.();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <LogOut className="size-4" aria-hidden />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
