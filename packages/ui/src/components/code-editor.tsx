import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface CodeEditorProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  language?: string; // e.g. "javascript", "python"
}

export function CodeEditor({
  value,
  onChange,
  language,
  className,
  disabled,
  ...props
}: CodeEditorProps) {
  return (
    <div
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-md border shadow-sm',
        className,
      )}
    >
      {language && (
        <div className="flex bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b">
          {language}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'min-h-[250px] w-full resize-y bg-[var(--bg-surface)] p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-brand-500/50',
          disabled && 'cursor-not-allowed opacity-60 bg-[var(--surface-muted)]',
        )}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        {...props}
      />
    </div>
  );
}
