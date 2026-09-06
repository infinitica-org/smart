'use client';

import { useRef, useState } from 'react';
import { Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import type { ResumeParseDraft } from '@smart/contracts';
import { api } from '@/lib/api';
import { extractResumeRawText } from '@/lib/extract-resume-text';
import { PrimaryButton, StepHeading } from '../wizard-ui';

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
      <StepHeading
        title="Let's build your profile"
        subtitle="Upload your resume and we'll do the rest — skills, experience, education, all mapped out."
      />

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
        className={`w-full min-h-[280px] rounded-2xl border-2 border-dashed px-8 py-10 flex flex-col items-center justify-center text-center transition-colors ${
          isDragging
            ? 'border-gray-400 bg-gray-50'
            : uploadStatus === 'success'
              ? 'border-emerald-300 bg-emerald-50/40'
              : uploadStatus === 'failed'
                ? 'border-red-300 bg-red-50/40'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
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
            <Upload className="w-8 h-8 text-blue-500 mb-4" />
            <p className="text-base font-semibold text-gray-900 mb-1">Upload Resume</p>
            <p className="text-sm text-gray-400 mb-1">Max file size of 5MB</p>
            <p className="text-sm text-gray-400">
              Only upload resume in (readable .pdf or .docx) format
            </p>
          </>
        )}

        {busy && (
          <div className="w-full max-w-xs">
            <Loader2 className="w-6 h-6 text-gray-700 animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              {uploadStatus === 'extracting' ? 'Reading file…' : 'Parsing resume…'}
            </p>
            <p className="text-xs text-gray-400 truncate">{fileName}</p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-4" />
            <p className="text-base font-semibold text-gray-900 mb-1">Resume parsed</p>
            <p className="text-sm text-gray-400 mb-4">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setFileName('');
                setDraft(null);
                setError(null);
              }}
              className="text-xs font-medium text-gray-700 hover:underline"
            >
              Use a different file
            </button>
          </>
        )}

        {uploadStatus === 'failed' && (
          <>
            <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
            <p className="text-base font-semibold text-gray-900 mb-1">Parse incomplete</p>
            <p className="text-sm text-gray-400 mb-4">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setFileName('');
                setDraft(null);
              }}
              className="text-xs font-medium text-gray-700 hover:underline"
            >
              Try another file
            </button>
          </>
        )}
      </button>

      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

      <div className="mt-6 flex items-center gap-2">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">OR</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <button
        type="button"
        onClick={() => onContinue(null)}
        disabled={busy}
        className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-40 mx-auto"
      >
        I don&apos;t have a resume yet →
      </button>

      <div className="mt-8 flex justify-end">
        <PrimaryButton
          onClick={() => onContinue(draft)}
          disabled={busy}
          loading={uploadStatus === 'parsing'}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
