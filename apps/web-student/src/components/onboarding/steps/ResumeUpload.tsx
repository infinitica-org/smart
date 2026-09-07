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
    <div className="flex flex-col w-full">
      <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-tight text-white mb-2">
        Let's build your profile
      </h1>
      <p className="text-sm sm:text-base text-zinc-400 font-axiforma leading-relaxed mb-8">
        Upload your resume and we'll do the rest — skills, experience, education, all mapped out.
      </p>

      <button
        type="button"
        onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
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
        className={`w-full min-h-[260px] rounded-3xl border border-dashed px-8 py-10 flex flex-col items-center justify-center text-center transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/5'
            : uploadStatus === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
              : uploadStatus === 'failed'
                ? 'border-rose-500/30 bg-rose-500/[0.04]'
                : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700'
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
            <div className="w-12 h-12 rounded-2xl border border-zinc-800 bg-zinc-900/80 flex items-center justify-center mb-4 text-emerald-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-lg font-display font-medium text-white mb-1">Upload Resume</p>
            <p className="text-xs text-zinc-400 font-axiforma mb-1">Max file size of 5MB</p>
            <p className="text-xs text-zinc-500 font-axiforma">
              Only upload resume in (readable .pdf or .docx) format
            </p>
          </>
        )}

        {busy && (
          <div className="w-full max-w-xs">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-display text-white mb-1">
              {uploadStatus === 'extracting' ? 'Reading file…' : 'Parsing resume…'}
            </p>
            <p className="text-xs text-zinc-400 truncate mb-2">{fileName}</p>
            <p className="text-[11px] text-zinc-500 font-axiforma">Preparing raw text for parser</p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-3" />
            <p className="text-base font-display font-medium text-white mb-1">Resume parsed</p>
            <p className="text-sm text-zinc-400 font-axiforma mb-3">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setFileName('');
                setDraft(null);
                setError(null);
              }}
              className="text-xs text-emerald-400 font-axiforma hover:underline"
            >
              Use a different file
            </button>
          </>
        )}

        {uploadStatus === 'failed' && (
          <>
            <AlertCircle className="w-8 h-8 text-rose-400 mb-3" />
            <p className="text-base font-display font-medium text-white mb-1">Parse incomplete</p>
            <p className="text-sm text-zinc-400 font-axiforma mb-3">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setFileName('');
                setDraft(null);
              }}
              className="text-xs text-emerald-400 font-axiforma hover:underline"
            >
              Try another file
            </button>
          </>
        )}
      </button>

      {error ? <p className="mt-3 text-sm text-rose-400 font-axiforma">{error}</p> : null}

      {/* OR Divider Line */}
      <div className="relative my-8 flex items-center justify-center">
        <div className="w-full border-t border-zinc-800/80" />
        <span className="absolute bg-zinc-950 px-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
          OR
        </span>
      </div>

      <div className="flex flex-col items-center mb-8">
        <button
          type="button"
          onClick={() => onContinue(null)}
          disabled={busy}
          className="text-sm text-zinc-400 hover:text-emerald-400 font-axiforma transition-colors disabled:opacity-40"
        >
          I don't have a resume yet →
        </button>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-end pt-4 border-t border-zinc-900">
        <button
          type="button"
          onClick={() => onContinue(draft)}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-axiforma font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
