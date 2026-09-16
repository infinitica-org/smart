import { inputClass, labelClass, mutedTextClass, sectionTitleClass } from '../../lib/tpo-ui';
import { labelFor } from '../../lib/job-posting';

function fieldId(label: string) {
  return `job-posting-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

export function JobPostingTextField({
  label,
  value,
  onChange,
  type,
  min,
  max,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const id = fieldId(label);
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className={labelClass}>
        {label}
        {required ? (
          <span className="text-[var(--ds-coral)]" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </span>
      <input
        id={id}
        aria-label={label}
        className={inputClass}
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}

export function JobPostingSelectField({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  optionLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  emptyLabel?: string;
  optionLabel?: (value: string) => string;
}) {
  const id = fieldId(label);
  const formatOption = optionLabel ?? labelFor;
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className={labelClass}>{label}</span>
      <select
        id={id}
        aria-label={label}
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function UnsupportedFieldNotice({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: readonly string[];
}) {
  return (
    <section className="rounded-2xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] p-6">
      <h2 className={sectionTitleClass}>{title}</h2>
      <p className={`mt-1 text-sm ${mutedTextClass}`}>{description}</p>
      <ul className={`mt-4 list-disc space-y-1 pl-5 text-sm ${mutedTextClass}`}>
        {fields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-semibold text-[var(--ds-text-secondary)]">
        Not saved — the current JobOpening contract has no persistence path for these fields.
      </p>
    </section>
  );
}
