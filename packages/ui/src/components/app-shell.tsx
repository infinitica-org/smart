import { useState, useEffect, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { SmartLogo } from './smart-logo';
import { Breadcrumbs, type BreadcrumbItem } from './breadcrumbs';
import { UserMenu } from './user-menu';
import { ThemeSwitcher } from './theme-switcher';
import {
  getPortalConfigForRole,
  isNavItemActive,
  type UserRole,
  type NavItemConfig,
} from '../navigation/role-nav-config';

export interface AppShellProps {
  role?: UserRole;
  user?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: UserRole | string;
    organizationName?: string | null;
  } | null;
  onSignOut?: () => void;
  productName?: string;
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  customNavItems?: NavItemConfig[];
  currentPathname?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppShell({
  role = 'STUDENT',
  user,
  onSignOut,
  productName,
  title,
  subtitle,
  breadcrumbs,
  customNavItems,
  currentPathname,
  actions,
  children,
  className,
}: AppShellProps) {
  const pathname =
    currentPathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const [mobileOpen, setMobileOpen] = useState(false);

  const effectiveRole = (user?.role as UserRole) || role;
  const config = getPortalConfigForRole(effectiveRole);
  const navItems = customNavItems || config.navItems;
  const activeTitle = title || config.portalName;
  const kicker = productName || config.kicker;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <div
      className={cn(
        'min-h-dvh bg-[var(--ds-background,var(--surface-muted))] text-[var(--ds-text,var(--text-primary))] flex flex-col',
        className,
      )}
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--ds-border-subtle,var(--surface-border))] bg-[var(--ds-surface,var(--surface))]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="size-5" aria-hidden />
            </button>

            <a
              href={config.homeUrl}
              className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] rounded-lg"
            >
              <SmartLogo kind="wordmark" className="h-6 sm:h-7" title={config.portalName} />
              {kicker ? (
                <span className="hidden sm:inline-flex rounded-full bg-[var(--ds-primary-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ds-primary)]">
                  {kicker}
                </span>
              ) : null}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <UserMenu user={user || { role: effectiveRole }} onSignOut={onSignOut} />
          </div>
        </div>
      </header>

      {/* Main Layout Container (Sidebar + Content) */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start gap-6 px-4 py-6 sm:px-6">
        {/* Desktop & Tablet Sidebar */}
        <aside className="sticky top-20 hidden w-56 shrink-0 flex-col rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-3 shadow-xs lg:flex">
          <nav className="space-y-1" aria-label="Portal Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]',
                    active
                      ? 'bg-[var(--ds-primary)] text-white shadow-xs'
                      : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)]',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.name}</span>
                  {item.badge ? (
                    <span
                      className={cn(
                        'ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--ds-primary-soft)] text-[var(--ds-primary)]',
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 space-y-5">
          {/* Breadcrumbs & Header Section */}
          {breadcrumbs || activeTitle || actions ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {breadcrumbs ? (
                  <Breadcrumbs items={breadcrumbs} homeUrl={config.homeUrl} className="mb-2" />
                ) : null}
                {activeTitle ? (
                  <h1 className="text-xl font-semibold tracking-tight text-[var(--ds-text)] sm:text-2xl">
                    {activeTitle}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p className="mt-1 text-xs text-[var(--ds-text-muted)]">{subtitle}</p>
                ) : null}
              </div>
              {actions ? <div className="flex items-center gap-2.5 shrink-0">{actions}</div> : null}
            </div>
          ) : null}

          {/* Page Content */}
          <div className="w-full">{children}</div>
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] border-r border-[var(--ds-border)] bg-[var(--ds-surface)] p-4 shadow-2xl flex flex-col z-50">
            <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-4">
              <a
                href={config.homeUrl}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
              >
                <SmartLogo kind="wordmark" className="h-6" title={config.portalName} />
              </a>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-1.5 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                aria-label="Close navigation menu"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-1.5 overflow-y-auto" aria-label="Mobile Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]',
                      active
                        ? 'bg-[var(--ds-primary)] text-white'
                        : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)]',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
