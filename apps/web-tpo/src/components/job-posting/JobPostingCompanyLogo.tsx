'use client';

import { useRef, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { openingsApi } from '../../lib/api';
import type { JobPostingCompanyLogo } from '../../lib/job-posting';
import { errorNoticeClass, mutedTextClass, secondaryButtonSmClass } from '../../lib/tpo-ui';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

export function JobPostingCompanyLogoField({
  logo,
  onChange,
}: {
  logo: JobPostingCompanyLogo | null;
  onChange: (next: JobPostingCompanyLogo | null) => void;
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
      const uploaded = await openingsApi.uploadLogo(file);
      onChange({
        storageKey: uploaded.storageKey,
        previewUrl: uploaded.previewUrl,
        fileName: uploaded.fileName,
      });
    } catch (caught) {
      setError(errorMessage(caught, 'Could not upload the logo.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 md:col-span-2">
      <div>
        <p className="text-sm font-semibold text-[var(--ds-text)]">Company logo</p>
        <p className={`mt-0.5 text-xs ${mutedTextClass}`}>
          JPG or PNG, up to 2MB. Shown on the posting preview and company repository.
        </p>
      </div>

      {error ? (
        <div role="alert" className={errorNoticeClass}>
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        {logo ? (
          <img
            src={logo.previewUrl}
            alt=""
            className="h-14 w-auto max-w-[160px] rounded-lg border border-[var(--ds-border-subtle)] object-contain bg-[var(--ds-surface)] p-1"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-xs font-medium text-[var(--ds-text-muted)]"
          >
            Logo
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => void onFileSelected(event)}
          />
          <button
            type="button"
            className={secondaryButtonSmClass}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : logo ? 'Replace logo' : 'Upload logo'}
          </button>
          {logo ? (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
