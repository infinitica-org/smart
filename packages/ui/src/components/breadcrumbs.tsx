import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  homeUrl?: string;
  className?: string;
}

export function Breadcrumbs({ items = [], homeUrl = '/', className = '' }: BreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={`text-xs text-[var(--ds-text-muted)] ${className}`}>
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li className="inline-flex items-center">
          <a
            href={homeUrl}
            className="inline-flex items-center text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
          >
            <Home className="size-3.5" aria-hidden />
            <span className="sr-only">Home</span>
          </a>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label + index} className="inline-flex items-center space-x-1.5">
              <ChevronRight className="size-3 text-[var(--ds-text-subtle)] shrink-0" aria-hidden />
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="font-medium transition-colors hover:text-[var(--ds-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={`font-semibold ${isLast ? 'text-[var(--ds-text)]' : ''}`}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
