import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names, last-wins on conflicts.
 *
 * `clsx` alone concatenates, so `cn('p-2', 'p-4')` would emit both and let CSS
 * source order decide — meaning a caller's override silently loses depending on
 * which file the bundler saw first. `twMerge` resolves the conflict predictably.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** First letters of each word, for avatars. Empty / whitespace → "?". */
export function getInitials(str: string): string {
  if (typeof str !== 'string' || !str.trim()) return '?';

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  );
}
