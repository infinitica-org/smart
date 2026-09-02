'use client';

import { useRef, useState } from 'react';
import { ArrowRight, FileText, CheckCircle2, Loader2 } from 'lucide-react';

interface ResumeUploadProps {
  onContinue: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export default function ResumeUpload({ onContinue }: ResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startUpload = (file: File) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const extOk = /\.(pdf|docx?)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extOk) {
      setError('Use a PDF or DOCX file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be 5 MB or smaller.');
      return;
    }

    setError(null);
    setFileName(file.name);
    setUploadStatus('uploading');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          return 100;
        }
        return Math.min(100, prev + 18);
      });
    }, 160);
  };

  return (
    <div className="flex flex-col w-full max-w-lg">
      <h2 className="text-[32px] leading-tight font-display font-medium tracking-tight text-white mb-2">
        Share your resume
      </h2>
      <p className="text-sm text-white/45 font-axiforma leading-relaxed mb-8">
        We pre-fill your profile from the file. You can skip this and enter details by hand.
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
          if (file && uploadStatus === 'idle') startUpload(file);
        }}
        className={`w-full min-h-[280px] rounded-2xl border border-dashed px-8 py-10 flex flex-col items-center justify-center text-center transition-colors ${
          isDragging
            ? 'border-[#00fad0] bg-[#00fad0]/5'
            : uploadStatus === 'success'
              ? 'border-[#00fad0]/25 bg-[#00fad0]/[0.04]'
              : 'border-white/12 bg-white/[0.02] hover:border-white/25'
        } ${uploadStatus === 'idle' ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) startUpload(file);
          }}
          className="hidden"
          accept=".pdf,.doc,.docx,application/pdf"
        />

        {uploadStatus === 'idle' && (
          <>
            <div className="w-12 h-12 rounded-xl border border-white/10 bg-[#141414] flex items-center justify-center mb-5">
              <FileText className="w-5 h-5 text-white/50" />
            </div>
            <p className="text-base font-display font-medium text-white mb-1">Upload your resume</p>
            <p className="text-sm text-white/40 font-axiforma mb-5">
              <span className="text-[#00fad0]">Choose a file</span> or drop it here
            </p>
            <span className="text-[11px] font-axiforma text-white/35 border border-white/8 rounded-full px-2.5 py-1">
              PDF or DOCX · max 5 MB
            </span>
          </>
        )}

        {uploadStatus === 'uploading' && (
          <div className="w-full max-w-xs">
            <Loader2 className="w-6 h-6 text-[#00fad0] animate-spin mx-auto mb-4" />
            <p className="text-sm font-display text-white mb-1">Reading file</p>
            <p className="text-xs text-white/40 truncate mb-4">{fileName}</p>
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#00fad0] transition-[width] duration-150"
                style={{ width: `${String(progress)}%` }}
              />
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <>
            <CheckCircle2 className="w-8 h-8 text-[#00fad0] mb-4" />
            <p className="text-base font-display font-medium text-white mb-1">Resume attached</p>
            <p className="text-sm text-white/40 font-axiforma mb-4">{fileName}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setFileName('');
                setProgress(0);
              }}
              className="text-xs text-[#00fad0] font-axiforma hover:underline"
            >
              Use a different file
            </button>
          </>
        )}
      </button>

      {error ? <p className="mt-3 text-sm text-red-400 font-axiforma">{error}</p> : null}

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={onContinue}
          disabled={uploadStatus === 'uploading'}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#00fad0] text-[#0a0a0a] text-sm font-axiforma font-medium disabled:opacity-40"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={uploadStatus === 'uploading'}
          className="text-sm text-white/40 hover:text-white/70 font-axiforma"
        >
          Enter details manually
        </button>
      </div>
    </div>
  );
}
