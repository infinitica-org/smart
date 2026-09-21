'use client';

import { useState } from 'react';
import { mutedTextClass } from '../../lib/tpo-ui';

export function JobOpeningIdLabel({
  openingId,
  className = '',
}: {
  openingId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(openingId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className={`text-[11px] font-medium uppercase tracking-wide ${mutedTextClass}`}>
        Job ID
      </span>
      <code className="rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-2 py-0.5 font-mono text-[11px] text-[var(--ds-text-secondary)]">
        {openingId}
      </code>
      <button
        type="button"
        className="text-[11px] font-semibold text-[var(--ds-link)] hover:underline"
        onClick={() => void copyId()}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
