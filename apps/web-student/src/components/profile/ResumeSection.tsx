'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { CandidateResumeFile } from '@smart/contracts';
import { api } from '@/lib/api';
import { profilePrimaryButtonClass } from '@/lib/profile-ui-classes';
import { extractResumeRawText } from '@/lib/extract-resume-text';

const MAX_BYTES = 5 * 1024 * 1024;

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'success' | 'failed';

export function ResumeSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [resumeFile, setResumeFile] = useState<CandidateResumeFile | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [parseMessage, setParseMessage] = useState<string | null>(null);

  const loadResume = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.users.getResume();
      setResumeFile(response.resumeFile);
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not load resume status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResume();
  }, []);

  const startUpload = async (file: File) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const extOk = /\.(pdf|docx?|txt)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extOk) {
      setError('Use a PDF, DOCX, DOC, or TXT file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be 5 MB or smaller.');
      return;
    }

    setError(null);
    setParseMessage(null);
    setUploadStatus('uploading');

    try {
      const uploaded = await api.users.uploadResume(file, file.name);
      setResumeFile(uploaded.resumeFile);
      setUploadStatus('parsing');

      const rawText = await extractResumeRawText(file);
      const parsed = await api.users.parseResume({ rawText });
      if (parsed.status === 'PARSED') {
        setParseMessage('Resume uploaded and parsed successfully.');
        setUploadStatus('success');
      } else {
        setParseMessage('Resume uploaded. Parsing could not extract structured data this time.');
        setUploadStatus('success');
      }
    } catch (err: unknown) {
      setUploadStatus('failed');
      setError(isSmartApiError(err) ? err.message : 'Resume upload failed.');
    }
  };

  const busy = uploadStatus === 'uploading' || uploadStatus === 'parsing';

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading resume…</p>;
  }

  return (
    <section aria-labelledby="resume-heading" className="space-y-4">
      <div>
        <h2
          id="resume-heading"
          className="flex items-center gap-2 text-xl font-semibold text-foreground"
        >
          <FileText className="h-5 w-5 text-foreground" />
          Resume Upload
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload or replace your resume. SMART can parse it to help pre-fill profile details.
        </p>
      </div>

      {resumeFile ? (
        <div className="rounded-2xl border border-border bg-muted/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{resumeFile.fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uploaded {new Date(resumeFile.uploadedAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {(resumeFile.fileSizeBytes / 1024).toFixed(0)} KB · {resumeFile.mimeType}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              On file
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
          No resume uploaded yet.
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        className={profilePrimaryButtonClass}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {resumeFile ? 'Replace resume' : 'Upload resume'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void startUpload(file);
          event.target.value = '';
        }}
      />

      {busy ? (
        <p className="text-sm text-foreground/80">
          {uploadStatus === 'uploading' ? 'Uploading resume…' : 'Parsing resume…'}
        </p>
      ) : null}

      {parseMessage ? (
        <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
          {parseMessage}
        </p>
      ) : null}

      {error ? (
        <p className="inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </section>
  );
}
