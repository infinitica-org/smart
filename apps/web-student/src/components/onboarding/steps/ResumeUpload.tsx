'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, FileText } from 'lucide-react';
import type { ResumeParseDraft } from '@smart/contracts';
import { api } from '@/lib/api';
import { extractResumeRawText } from '@/lib/extract-resume-text';

interface ResumeUploadProps {
  onContinue: (draft: ResumeParseDraft | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

type UploadStatus = 'idle' | 'extracting' | 'parsing' | 'success' | 'failed';

export default function ResumeUpload({ onContinue }: ResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResumeParseDraft | null>(null);

  const busy = uploadStatus === 'extracting' || uploadStatus === 'parsing';

  const startUpload = async (file: File) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const extOk = /\.(pdf|docx?|txt)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extOk) {
      setError('Use a PDF, DOCX, or TXT file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be 5 MB or smaller.');
      return;
    }

    setError(null);
    setFileName(file.name);
    setDraft(null);
    setUploadStatus('extracting');

    try {
      const rawText = await extractResumeRawText(file);
      setUploadStatus('parsing');
      const response = await api.users.parseResume({ rawText });
      if (response.status === 'PARSED' && response.draft) {
        setDraft(response.draft);
        setUploadStatus('success');
      } else {
        setUploadStatus('failed');
        setError('Resume parse failed. You can continue and enter details manually.');
      }
    } catch (err) {
      setUploadStatus('failed');
      setError(err instanceof Error ? err.message : 'Resume upload failed.');
    }
  };

  return (
    <div className="flex w-full flex-col">
      <h1 className="mb-2 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
        Let's build your profile
      </h1>
      <p className="mb-8 font-axiforma text-sm leading-relaxed text-muted-foreground sm:text-base">
        Upload your resume and we'll do the rest — skills, experience, education, all mapped out.
      </p>

      <div
        role={uploadStatus === 'idle' ? 'button' : undefined}
        tabIndex={uploadStatus === 'idle' ? 0 : undefined}
        onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (uploadStatus !== 'idle') return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (uploadStatus === 'idle') setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file && uploadStatus === 'idle') void startUpload(file);
        }}
        className={`flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border border-dashed px-8 py-10 text-center transition-all ${
          isDragging
            ? 'border-foreground bg-foreground/5'
            : uploadStatus === 'success'
              ? 'border-border bg-muted'
              : uploadStatus === 'failed'
                ? 'border-rose-300 bg-rose-50'
                : 'border-border bg-muted/50 hover:border-foreground/30 hover:bg-muted'
        } ${uploadStatus === 'idle' ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void startUpload(file);
          }}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain"
        />

        {uploadStatus === 'idle' && (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <p className="mb-1 font-display text-lg font-medium text-foreground">Upload Resume</p>
            <p className="mb-1 font-axiforma text-xs text-muted-foreground">Max file size of 5MB</p>
            <p className="font-axiforma text-xs text-muted-foreground">
              Only upload resume in (readable .pdf or .docx) format
            </p>
          </>
        )}

        {busy && (
          <div className="w-full max-w-xs">
            <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-foreground" />
            <p className="mb-1 font-display text-sm text-foreground">
              {uploadStatus === 'extracting' ? 'Reading file…' : 'Parsing resume…'}
            </p>
            <p className="mb-2 truncate text-xs text-muted-foreground">{fileName}</p>
            <p className="font-axiforma text-[11px] text-muted-foreground">
              Preparing raw text for parser
            </p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <>
            <CheckCircle2 className="mb-3 h-8 w-8 text-foreground" />
            <p className="mb-1 font-display text-base font-medium text-foreground">Resume parsed</p>
            <p className="mb-3 font-axiforma text-sm text-muted-foreground">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setFileName('');
                setDraft(null);
                setError(null);
              }}
              className="font-axiforma text-xs text-foreground hover:underline"
            >
              Use a different file
            </button>
          </>
        )}

        {uploadStatus === 'failed' && (
          <>
            <AlertCircle className="mb-3 h-8 w-8 text-rose-600" />
            <p className="mb-1 font-display text-base font-medium text-foreground">
              Parse incomplete
            </p>
            <p className="mb-3 font-axiforma text-sm text-muted-foreground">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setFileName('');
                setDraft(null);
              }}
              className="font-axiforma text-xs text-foreground hover:underline"
            >
              Try another file
            </button>
          </>
        )}
      </div>

      {error ? <p className="mt-3 font-axiforma text-sm text-rose-600">{error}</p> : null}

      <div className="relative my-8 flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-background px-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          OR
        </span>
      </div>

      <div className="mb-8 flex flex-col items-center">
        <button
          type="button"
          onClick={() => onContinue(null)}
          disabled={busy}
          className="font-axiforma text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          I don't have a resume yet →
        </button>
      </div>

      <div className="flex items-center justify-end border-t border-border pt-4">
        <button
          type="button"
          onClick={() => draft && onContinue(draft)}
          disabled={busy || uploadStatus !== 'success' || !draft}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-7 py-3 font-axiforma text-sm font-bold text-[#131313] shadow-sm transition-all hover:bg-foreground/90 disabled:opacity-40"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
