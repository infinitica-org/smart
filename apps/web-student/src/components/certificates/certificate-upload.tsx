'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024;

interface CertificateUploadProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  error?: string | null;
}

export function CertificateUpload({
  onUpload,
  isUploading,
  error: externalError,
}: CertificateUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndUpload = (file: File) => {
    setLocalError(null);
    if (!ACCEPTED.includes(file.type)) {
      setLocalError('Only PDF, JPG, and PNG files are accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError('The file must be 10MB or smaller.');
      return;
    }
    onUpload(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-white">Upload Certificate</h3>
      <p className="text-xs text-white/45">Upload your certificate to start verification.</p>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) validateAndUpload(file);
        }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver ? 'border-[#00fad0]/60 bg-[#00fad0]/5' : 'border-white/15'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/40">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Drag &amp; drop your certificate</p>
          <p className="text-xs text-white/40">or browse files</p>
        </div>
        <p className="text-[11px] text-white/30">PDF / JPG / PNG · Max 10MB</p>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#7dffe6] disabled:opacity-50"
        >
          {isUploading ? 'Uploading…' : 'Upload Certificate'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) validateAndUpload(file);
            event.target.value = '';
          }}
        />
      </div>
      {(localError ?? externalError) ? (
        <p className="text-sm text-danger">{localError ?? externalError}</p>
      ) : null}
    </div>
  );
}
