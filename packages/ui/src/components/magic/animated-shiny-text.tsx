import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<'span'> {
  shimmerWidth?: number;
  children: ReactNode;
}

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}: AnimatedShinyTextProps) {
  return (
    <span
      style={{ '--shiny-width': `${shimmerWidth}px` } as CSSProperties}
      className={cn(
        'max-w-md text-[var(--text-muted)]',
        'animate-shiny-text bg-size-[var(--shiny-width)_100%] bg-clip-text bg-no-repeat',
        'bg-linear-to-r from-transparent via-paper/80 via-50% to-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
