'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  function cycleTheme() {
    const order = ['light', 'dark', 'system'] as const;
    const current = order.includes(theme as (typeof order)[number])
      ? (theme as (typeof order)[number])
      : 'system';
    const next = order[(order.indexOf(current) + 1) % order.length] ?? 'system';
    setTheme(next);
  }

  return (
    <Button
      size="icon"
      variant="secondary"
      className="rounded-full"
      onClick={cycleTheme}
      aria-label={`Current theme: ${theme ?? 'system'}. Click to cycle themes`}
    >
      {theme === 'system' ? (
        <Monitor strokeWidth={1.75} />
      ) : resolvedTheme === 'dark' ? (
        <Sun strokeWidth={1.75} />
      ) : (
        <Moon strokeWidth={1.75} />
      )}
    </Button>
  );
}
