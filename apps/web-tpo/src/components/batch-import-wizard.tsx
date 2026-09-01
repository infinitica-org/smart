'use client';

import { useRef, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import {
  API_PREFIX,
  BatchImportMappingSchema,
  BatchImportResultDtoSchema,
  type BatchImportMapping,
  type BatchImportResultDto,
} from '@smart/contracts';
import { Alert, Button } from '@smart/ui';
import { api, apiClient } from '../lib/api';

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

function safeMessage(caught: unknown, fallback: string) {
  if (isSmartApiError(caught)) return caught.message;
  if (caught instanceof Error) return caught.message;
  return fallback;
}

export function BatchImportWizard({ batchId }: { batchId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState<BatchImportMapping | null>(null);
  const [result, setResult] = useState<BatchImportResultDto | null>(null);
  const [inviteOk, setInviteOk] = useState(false);
  const [enqueued, setEnqueued] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importPath = `${API_PREFIX}/tpo/batches/${batchId}/members/import`;

  function reset() {
    setFile(null);
    setHeaders([]);
    setMapping(EMPTY);
    setConfirmed(null);
    setResult(null);
    setInviteOk(false);
    setEnqueued(null);
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
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', selectedFile);
      const probe = await apiClient.postForm(importPath, body, {
        query: { dryRun: true },
        schema: BatchImportResultDtoSchema,
      });
      const detected = probe.headers ?? [];
      if (detected.length === 0) throw new Error('No column headers were found in row 1.');
      setFile(selectedFile);
      setHeaders(detected);
      setMapping(suggestBatchImportMapping(detected));
    } catch (caught) {
      setFile(null);
      setError(safeMessage(caught, 'The file could not be read.'));
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

  async function confirmAndImport() {
    if (!file || !mappingReady) return;
    const payload = toBatchImportMapping(mapping);
    setConfirmed(payload);
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('mapping', JSON.stringify(payload));
      setResult(await apiClient.postForm(importPath, body, { schema: BatchImportResultDtoSchema }));
      setInviteOk(false);
      setEnqueued(null);
    } catch (caught) {
      setError(safeMessage(caught, 'Import could not be completed. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function sendInvites() {
    const pending = result?.pendingInvitations ?? 0;
    if (!inviteOk || pending === 0) return;
    setBusy(true);
    setError(null);
    try {
      setEnqueued((await api.onboarding.sendBatchInvites(batchId)).enqueued);
    } catch {
      setError('Invitations could not be queued. Please try again.');
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
  const pending = result?.pendingInvitations ?? 0;
  const step = !file ? 0 : result ? 2 : 1;

  return (
    <section className="space-y-5" aria-labelledby="bulk-provisioning-title">
      <h2 id="bulk-provisioning-title" className="text-xl font-semibold text-ink">
        Bulk candidate provisioning
      </h2>
      <ol className="grid grid-cols-3 gap-1" aria-label="Provisioning progress">
        {['Upload', 'Map columns', 'Preview'].map((label, index) => (
          <li key={label} aria-current={step === index ? 'step' : undefined}>
            <div
              className={`h-1.5 rounded-full ${step >= index ? 'bg-accent' : 'bg-[var(--surface-border)]'}`}
            />
          </li>
        ))}
      </ol>
      <div aria-live="polite" aria-atomic="true">
        {busy ? <p className="text-sm text-ink-muted">Processing securely…</p> : null}
        {error ? <Alert tone="danger" title={error} role="alert" /> : null}
      </div>
      {file || result ? null : (
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
      {file && !result ? (
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
            {confirmed && !result ? (
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
              <Button disabled={!mappingReady || busy} onClick={() => void confirmAndImport()}>
                Confirm mapping
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {result ? (
        <ImportOutcome
          result={result}
          pending={pending}
          inviteOk={inviteOk}
          enqueued={enqueued}
          busy={busy}
          onInviteOk={setInviteOk}
          onSend={() => void sendInvites()}
          onReset={reset}
        />
      ) : null}
    </section>
  );
}

function ImportOutcome({
  result,
  pending,
  inviteOk,
  enqueued,
  busy,
  onInviteOk,
  onSend,
  onReset,
}: {
  result: BatchImportResultDto;
  pending: number;
  inviteOk: boolean;
  enqueued: number | null;
  busy: boolean;
  onInviteOk: (value: boolean) => void;
  onSend: () => void;
  onReset: () => void;
}) {
  const empty = result.imported === 0 && (result.validRows ?? 0) === 0;
  const partial = result.imported > 0 && result.errors.length > 0;
  const counts = [
    ['Valid', result.validRows ?? 0],
    ['Invalid', result.invalidRows ?? 0],
    ['Existing students', result.existingStudents ?? 0],
    ['New accounts', result.newAccounts ?? 0],
    ['Pending invitations', pending],
    ['Imported', result.imported],
  ] as const;
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold tracking-tight text-ink">Data preview</h3>
      {empty ? <Alert tone="info" title="No candidates were imported from this file." /> : null}
      {partial ? (
        <Alert tone="warning" title="Some rows imported successfully. Review the errors below." />
      ) : null}
      {!empty && result.errors.length === 0 ? (
        <Alert tone="success" title="Import completed. Review invitation sending below." />
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Import summary">
        {counts.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
          >
            <p className="text-xl font-semibold text-accent">{value}</p>
            <p className="text-xs text-ink-muted">{label}</p>
          </div>
        ))}
      </div>
      {result.errors.length ? <ErrorTable errors={result.errors} /> : null}
      {enqueued === null ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          <h4 className="font-heading text-base font-semibold text-ink">Invitation preview</h4>
          <p className="mt-2 text-sm text-ink-muted">
            This batch currently has {pending} pending invitation{pending === 1 ? '' : 's'}. Sending
            queues every pending invitation for this batch, including invitations that were already
            pending before this upload. Expected emails to queue: {pending}.
          </p>
          {pending > 0 ? (
            <label className="mt-4 flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={inviteOk}
                onChange={(event) => onInviteOk(event.target.checked)}
                className="mt-1 accent-accent"
              />
              <span>
                I confirm that SMART should queue {pending} invitation emails for this batch.
              </span>
            </label>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">There are no pending invitations to send.</p>
          )}
          <div className="mt-4">
            <Button disabled={pending === 0 || !inviteOk || busy} isLoading={busy} onClick={onSend}>
              Send {pending} invitations
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-card)]"
          role="status"
        >
          <span
            aria-hidden="true"
            className="motion-safe:animate-pulse mx-auto grid size-12 place-items-center rounded-full bg-accent text-lg text-ink"
          >
            ✓
          </span>
          <p className="mt-3 text-lg font-semibold text-ink">
            {enqueued} invitation{enqueued === 1 ? '' : 's'} queued successfully
          </p>
        </div>
      )}
      <Button variant="ghost" onClick={onReset} disabled={busy}>
        Replace file
      </Button>
    </div>
  );
}

function ErrorTable({ errors }: { errors: BatchImportResultDto['errors'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[32rem] w-full text-sm" aria-label="Rows requiring attention">
        <caption className="pb-2 text-left font-medium text-ink">
          {errors.length} row{errors.length === 1 ? '' : 's'} requiring attention
        </caption>
        <thead>
          <tr className="text-left text-ink-muted">
            <th scope="col" className="border-b p-2">
              Row
            </th>
            <th scope="col" className="border-b p-2">
              Email
            </th>
            <th scope="col" className="border-b p-2">
              Reason
            </th>
          </tr>
        </thead>
        <tbody>
          {errors.map((item) => (
            <tr
              key={`${item.row}-${item.email ?? ''}`}
              className="border-b border-[var(--surface-border)]"
            >
              <td className="p-2 font-mono text-xs">{item.row}</td>
              <td className="p-2">{item.email || '—'}</td>
              <td className="p-2">{item.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
