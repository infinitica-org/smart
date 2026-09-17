'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@smart/ui';

export function ColorSchemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Theme'}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-icon)] transition hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] disabled:opacity-60',
        className,
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Moon className="h-4 w-4" aria-hidden="true" />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
