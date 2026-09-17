'use client';

import { useId, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import type { CandidateEducationDocumentDto } from '@smart/contracts';
import {
  profilePrimaryButtonSmClass,
  profileSecondaryButtonSmClass,
} from '@/lib/profile-ui-classes';

const DOCUMENT_TYPE_LABELS: Record<CandidateEducationDocumentDto['documentType'], string> = {
  DEGREE_CERTIFICATE: 'Degree certificate',
  MARKSHEET: 'Marksheet',
  TRANSCRIPT: 'Transcript',
  OTHER: 'Other proof',
};

const ACCEPT = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
const MAX_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface EducationProofUploadModalProps {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    documentType: CandidateEducationDocumentDto['documentType'];
    file: File;
  }) => void;
}

export function EducationProofUploadModal({
  open,
  uploading,
  onClose,
  onSubmit,
}: EducationProofUploadModalProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] =
    useState<CandidateEducationDocumentDto['documentType']>('DEGREE_CERTIFICATE');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!open) return null;

  function pickFile(next: File | undefined) {
    if (!next) return;
    setLocalError(null);
    const extOk = /\.(pdf|png|jpe?g)$/i.test(next.name);
    const typeOk = next.type === 'application/pdf' || next.type.startsWith('image/');
    if (!extOk && !typeOk) {
      setLocalError('Use a PDF, PNG, or JPG file.');
      setFile(null);
      return;
    }
    if (next.size > MAX_MB * 1024 * 1024) {
      setLocalError(`File must be ${MAX_MB} MB or smaller.`);
      setFile(null);
      return;
    }
    setFile(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setLocalError('Choose a file to upload.');
      return;
    }
    onSubmit({ documentType: docType, file });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="education-proof-title"
        className="font-[family-name:var(--tpo-font-sans)] flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-[0_18px_48px_rgba(15,23,42,0.14)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--ds-border)] px-5 py-4">
          <div>
            <h3
              id="education-proof-title"
              className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--ds-text)]"
            >
              Add education proof
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--ds-text-muted)]">
              Marksheet, degree, or transcript (PDF or image).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-surface-hover)]"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="education-proof-type"
              className="mb-1.5 block text-[13px] font-medium text-[var(--ds-text)]"
            >
              Document type
            </label>
            <select
              id="education-proof-type"
              value={docType}
              onChange={(event) =>
                setDocType(event.target.value as CandidateEducationDocumentDto['documentType'])
              }
              className="h-11 w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3.5 text-sm text-[var(--ds-text)] focus:border-[var(--ds-green)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green-soft)]"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--ds-text)]">
              Proof file
            </span>
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(event) => pickFile(event.target.files?.[0])}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                pickFile(event.dataTransfer.files[0]);
              }}
              className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                dragging
                  ? 'border-[var(--ds-green)] bg-[var(--ds-green-soft)]/40'
                  : file
                    ? 'border-[var(--ds-green)]/50 bg-[var(--ds-green-soft)]/25'
                    : 'border-[var(--ds-border)] bg-[var(--ds-surface-muted)] hover:border-[var(--ds-green)]/40 hover:bg-[var(--ds-surface-hover)]'
              }`}
            >
              {file ? (
                <>
                  <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-[var(--ds-surface)] text-[var(--ds-green)] shadow-sm">
                    <FileText className="size-5" aria-hidden />
                  </div>
                  <p className="max-w-full truncate text-sm font-semibold text-[var(--ds-text)]">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">
                    {formatBytes(file.size)} · Click or drop to replace
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-[var(--ds-surface)] text-[#2563eb] shadow-sm">
                    <Upload className="size-5" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-[var(--ds-text)]">
                    Drop file here or browse
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--ds-text-muted)]">
                    PDF, PNG, JPG · max {MAX_MB} MB
                  </p>
                </>
              )}
            </div>
          </div>

          {localError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {localError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-[var(--ds-border)] pt-4">
            <button type="button" onClick={onClose} className={profileSecondaryButtonSmClass}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className={profilePrimaryButtonSmClass}
            >
              {uploading ? 'Uploading…' : 'Attach proof'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
