'use client';

import { useRef, useState } from 'react';
import {
  API_PREFIX,
  BatchImportMappingSchema,
  BatchImportResultDtoSchema,
  type BatchImportMapping,
} from '@smart/contracts';
import { Alert, Button } from '@smart/ui';
import { apiClient } from '../lib/api';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FIELDS = [
  { key: 'fullName', label: 'Full Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'groupLabel', label: 'Group', required: false },
] as const;

type MappingState = Record<keyof BatchImportMapping, string>;
const EMPTY: MappingState = { fullName: '', email: '', groupLabel: '' };
const HINTS: Record<keyof MappingState, string[]> = {
  fullName: ['name', 'fullname', 'studentname', 'candidatename'],
  email: ['email', 'emailaddress', 'mail'],
  groupLabel: ['group', 'department', 'section', 'class', 'division'],
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function suggestBatchImportMapping(headers: string[]): MappingState {
  const find = (field: keyof MappingState) =>
    headers.find((header) => HINTS[field].includes(normalize(header))) ?? '';
  return { fullName: find('fullName'), email: find('email'), groupLabel: find('groupLabel') };
}

export function validateBatchImportFile(file: File): string | null {
  const extension = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1];
  if (!extension || !['csv', 'xlsx'].includes(extension)) {
    return 'Unsupported file type. Choose a CSV or XLSX file.';
  }
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_FILE_BYTES) return 'The selected file exceeds the 5 MB limit.';
  return null;
}

export function toBatchImportMapping(mapping: MappingState): BatchImportMapping {
  return BatchImportMappingSchema.parse({
    fullName: mapping.fullName,
    email: mapping.email,
    ...(mapping.groupLabel ? { groupLabel: mapping.groupLabel } : {}),
  });
}

export function BatchImportWizard({ batchId }: { batchId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState<BatchImportMapping | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setHeaders([]);
    setMapping(EMPTY);
    setConfirmed(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function chooseFile(selectedFile: File) {
    const invalid = validateBatchImportFile(selectedFile);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    setConfirmed(null);
    try {
      const body = new FormData();
      body.append('file', selectedFile);
      const probe = await apiClient.postForm(
        `${API_PREFIX}/tpo/batches/${batchId}/members/import`,
        body,
        { query: { dryRun: true }, schema: BatchImportResultDtoSchema },
      );
      const detected = probe.headers ?? [];
      if (detected.length === 0) throw new Error('No column headers were found in row 1.');
      setFile(selectedFile);
      setHeaders(detected);
      setMapping(suggestBatchImportMapping(detected));
    } catch (caught) {
      setFile(null);
      setError(caught instanceof Error ? caught.message : 'The file could not be read.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    setBusy(true);
    setError(null);
    try {
      const blob = await apiClient.getBlob(`${API_PREFIX}/tpo/batches/${batchId}/import-template`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'smart-student-import-template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('The import template could not be downloaded. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const selected = Object.values(mapping).filter(Boolean);
  const duplicate = new Set(selected).size !== selected.length;
  const mappingReady = Boolean(mapping.fullName && mapping.email && !duplicate);
  const zone = dragging
    ? 'border-accent bg-accent-deep/20'
    : 'border-[var(--surface-border)] bg-[var(--surface-muted)]';

  return (
    <section className="space-y-5" aria-labelledby="bulk-provisioning-title">
      <h2 id="bulk-provisioning-title" className="text-xl font-semibold text-ink">
        Bulk candidate provisioning
      </h2>
      <ol className="grid grid-cols-2 gap-1" aria-label="Provisioning progress">
        <li aria-current={file ? undefined : 'step'}>
          <div className="h-1.5 rounded-full bg-accent" />
        </li>
        <li aria-current={file ? 'step' : undefined}>
          <div
            className={`h-1.5 rounded-full ${file ? 'bg-accent' : 'bg-[var(--surface-border)]'}`}
          />
        </li>
      </ol>
      <div aria-live="polite" aria-atomic="true">
        {busy ? <p className="text-sm text-ink-muted">Processing securely…</p> : null}
        {error ? <Alert tone="danger" title={error} role="alert" /> : null}
      </div>
      {file ? null : (
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            aria-label="Choose candidate CSV or XLSX file"
            disabled={busy}
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (next) void chooseFile(next);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const next = event.dataTransfer.files[0];
              if (next && !busy) void chooseFile(next);
            }}
            className={`group relative min-h-56 w-full overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 ${zone}`}
          >
            <span
              aria-hidden="true"
              className="motion-safe:animate-pulse absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
            />
            <span className="block text-base font-semibold text-ink">
              {dragging ? 'Drop the file to continue' : 'Drop a roster here or browse'}
            </span>
            <span className="mt-2 block text-sm text-ink-muted">
              CSV or XLSX · maximum 5 MB · row 1 must contain headers
            </span>
          </button>
          <div className="flex justify-center">
            <Button variant="ghost" disabled={busy} onClick={() => void downloadTemplate()}>
              Download XLSX template
            </Button>
          </div>
        </div>
      )}
      {file ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h3 className="font-heading text-lg font-semibold tracking-tight">
            Map uploaded columns
          </h3>
          <div className="mt-4 space-y-4">
            <p className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3 text-sm text-ink">
              Selected file: <span className="font-medium">{file.name}</span>
              <span className="text-ink-muted">
                {' '}
                · {file.size} bytes · {file.name.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'CSV'}
              </span>
            </p>
            <p className="text-sm text-ink-muted">Detected headers: {headers.join(', ')}</p>
            {FIELDS.map((field) => (
              <div
                key={field.key}
                className="grid gap-1.5 sm:grid-cols-[10rem_1fr] sm:items-center"
              >
                <label htmlFor={`mapping-${field.key}`} className="text-sm font-medium text-ink">
                  {field.label}
                  {field.required ? <span aria-hidden="true"> *</span> : ' (optional)'}
                </label>
                <select
                  id={`mapping-${field.key}`}
                  value={mapping[field.key]}
                  aria-required={field.required}
                  disabled={busy}
                  onChange={(event) => {
                    setConfirmed(null);
                    setMapping((current) => ({ ...current, [field.key]: event.target.value }));
                  }}
                  className="min-h-10 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-bg)] px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">Do not import</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {duplicate ? (
              <Alert
                tone="danger"
                title="Each SMART field must use a different uploaded column."
                role="alert"
              />
            ) : null}
            {!mapping.fullName || !mapping.email ? (
              <p className="text-sm text-ink-muted" role="status">
                Map both Full Name and Email to continue.
              </p>
            ) : null}
            {confirmed ? (
              <p className="text-sm text-ink" role="status">
                {`Mapping payload ready: fullName=${confirmed.fullName}; email=${confirmed.email}${
                  confirmed.groupLabel ? `; groupLabel=${confirmed.groupLabel}` : ''
                }`}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Replace file
              </Button>
              <Button
                disabled={!mappingReady || busy}
                onClick={() => mappingReady && setConfirmed(toBatchImportMapping(mapping))}
              >
                Confirm mapping
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
