'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AnimatedGridPattern } from '../magic/animated-grid-pattern';
import { AnimatedShinyText } from '../magic/animated-shiny-text';
import { BorderBeam } from '../magic/border-beam';
import { cn } from '../../lib/cn';
import { SmartLogo } from '../smart-logo';

export interface ConsoleNavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface ConsoleShellProps {
  brand?: string;
  homeHref: string;
  pathname: string;
  items: ConsoleNavItem[];
  promo?: ReactNode;
  headerRight?: ReactNode;
  greeting?: string;
  subtitle?: string;
  children: ReactNode;
}

export function ConsoleShell({
  brand = 'SMART',
  homeHref,
  pathname,
  items,
  promo,
  headerRight,
  greeting,
  subtitle,
  children,
}: ConsoleShellProps) {
  return (
    <div className="flex min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--surface-border)] bg-[var(--surface)]">
        <a href={homeHref} className="flex items-center px-5 py-5" aria-label={brand}>
          <SmartLogo kind="wordmark" className="h-7" title={brand} />
        </a>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Console">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === homeHref
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-brand-500/10 font-medium text-brand-400 shadow-[0_0_18px_rgba(0,250,208,0.18)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                {active ? <BorderBeam size={60} duration={7} borderWidth={1} /> : null}
                <Icon className="size-4 shrink-0" />
                {item.title}
              </a>
            );
          })}
        </nav>
        {promo ? <div className="p-3">{promo}</div> : null}
      </aside>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <AnimatedGridPattern
          className="fill-brand-500/10 stroke-brand-500/10"
          numSquares={28}
          maxOpacity={0.18}
        />
        <div className="relative z-10 flex h-full flex-col">
          <header className="flex items-center justify-between gap-4 px-6 py-5">
            <div>
              {greeting ? (
                <h1 className="font-heading text-2xl font-extrabold">{greeting}</h1>
              ) : null}
              {subtitle ? (
                <AnimatedShinyText className="text-sm">{subtitle}</AnimatedShinyText>
              ) : null}
            </div>
            {headerRight}
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function ConsolePromoCard({ title = 'Stronger placements. Together.' }: { title?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
      <BorderBeam size={70} duration={9} />
      <SmartLogo kind="mark" className="h-7" />
      <p className="mt-2 text-sm font-medium leading-snug">{title}</p>
    </div>
  );
}
