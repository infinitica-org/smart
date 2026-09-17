'use client';

import { useRef, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { JobOpeningAttachedDocument } from '@smart/contracts';
import { openingsApi } from '../../lib/api';
import { errorNoticeClass, mutedTextClass, secondaryButtonSmClass } from '../../lib/tpo-ui';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

export function JobPostingAttachedDocuments({
  documents,
  onChange,
}: {
  documents: JobOpeningAttachedDocument[];
  onChange: (next: JobOpeningAttachedDocument[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const uploaded = await openingsApi.uploadDocument(file);
      onChange([...documents, uploaded]);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not upload the document.'));
    } finally {
      setUploading(false);
    }
  }

  function remove(documentId: string) {
    onChange(documents.filter((doc) => doc.documentId !== documentId));
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-[var(--ds-text)]">Attached documents</p>
        <p className={`mt-0.5 text-xs ${mutedTextClass}`}>
          PDF, JPG, or PNG up to 10MB. Files are stored with the job opening when you post.
        </p>
      </div>

      {error ? (
        <div role="alert" className={errorNoticeClass}>
          {error}
        </div>
      ) : null}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(event) => void onFileSelected(event)}
        />
        <button
          type="button"
          className={secondaryButtonSmClass}
          disabled={uploading || documents.length >= 10}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
      </div>

      {documents.length === 0 ? (
        <p className={`text-sm ${mutedTextClass}`}>No documents attached yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.documentId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2 text-sm"
            >
              <span className="font-medium text-[var(--ds-text)]">{doc.fileName}</span>
              <button
                type="button"
                className="text-xs font-semibold text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
                onClick={() => remove(doc.documentId)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
