import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';

export interface AssessmentNavigationProps extends HTMLAttributes<HTMLDivElement> {
  onPrevious?: () => void;
  onNext?: () => void;
  canPrevious?: boolean;
  canNext?: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

export function AssessmentNavigation({
  onPrevious,
  onNext,
  canPrevious = true,
  canNext = true,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  className,
  ...props
}: AssessmentNavigationProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-[var(--surface-border)] pt-4 mt-6',
        className,
      )}
      {...props}
    >
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={!canPrevious}
        className={cn(!canPrevious && 'opacity-0 pointer-events-none')}
      >
        {previousLabel}
      </Button>

      <Button variant="primary" onClick={onNext} disabled={!canNext}>
        {nextLabel}
      </Button>
    </div>
  );
}
