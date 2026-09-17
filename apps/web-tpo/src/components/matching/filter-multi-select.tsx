'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { inputClass, mutedTextClass } from '../../lib/tpo-ui';

export interface FilterOption {
  id: string;
  label: string;
}

/**
 * Search + dropdown + removable-chips multi-select, for scoping a match run to a handful of
 * items (batches, required skills) out of a potentially long list. Generic over `options` so
 * both filters in the matching workspace share one implementation.
 */
export function FilterMultiSelect({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = options.filter((option) => selectedIds.includes(option.id));
  const matches = options
    .filter((option) => !selectedIds.includes(option.id))
    .filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  function add(id: string) {
    onChange([...selectedIds, id]);
    setQuery('');
  }

  function remove(id: string) {
    onChange(selectedIds.filter((existing) => existing !== id));
  }

  return (
    <div className="relative">
      <label className={`mb-1.5 block text-xs font-semibold text-[var(--ds-text-secondary)]`}>
        {label}
      </label>

      {selected.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--tpo-accent-border)] bg-[var(--tpo-accent-tint)] px-2.5 py-1 text-xs font-medium text-[var(--ds-text)]"
            >
              {option.label}
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={() => remove(option.id)}
                className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <input
        type="text"
        className={inputClass}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />

      {open && matches.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] py-1 shadow-lg">
          {matches.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(option.id)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected.length === 0 && matches.length === 0 && query.trim() ? (
        <p className={`mt-1 text-xs ${mutedTextClass}`}>No matches.</p>
      ) : null}
    </div>
  );
}
