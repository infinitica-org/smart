'use client';

import { useRef, useState } from 'react';
import { Upload, FileCheck, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Button, Input } from '@smart/ui';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024;

interface CertificateUploadProps {
  onUpload: (file: File) => void;
  onSourceUrlSubmit?: (url: string) => void;
  isUploading?: boolean;
  error?: string | null;
  currentFileName?: string | null;
  currentSourceUrl?: string | null;
}

export function CertificateUpload({
  onUpload,
  onSourceUrlSubmit,
  isUploading,
  error: externalError,
  currentFileName,
  currentSourceUrl,
}: CertificateUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(currentSourceUrl ?? '');

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

  const handleUrlSubmit = () => {
    setLocalError(null);
    if (!urlInput.trim()) {
      setLocalError('Please enter a valid URL.');
      return;
    }
    try {
      new URL(urlInput.trim());
    } catch {
      setLocalError('Enter a valid URL starting with http:// or https://');
      return;
    }
    if (onSourceUrlSubmit) {
      onSourceUrlSubmit(urlInput.trim());
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Provide Certificate Proof</h3>
        <p className="text-xs text-muted-foreground">
          Upload your official certificate document (PDF, JPG, PNG) OR provide a public verification
          URL.
        </p>
      </div>

      {currentFileName && (
        <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 p-3 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-success" />
            <span>
              Uploaded: <strong className="font-mono text-success">{currentFileName}</strong>
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Uploaded File</span>
        </div>
      )}

      {/* File Dropzone */}
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
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? 'border-[#00967c]/60 bg-[#00967c]/5' : 'border-border bg-muted/30'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Drag &amp; drop your certificate document
          </p>
          <p className="text-xs text-muted-foreground">or browse from your device</p>
        </div>
        <p className="text-[11px] text-muted-foreground/70">
          Accepted Formats: PDF, JPG, PNG (Max 10MB)
        </p>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#7dffe6] disabled:opacity-50"
        >
          {isUploading ? 'Uploading Document…' : 'Browse & Upload File'}
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

      {onSourceUrlSubmit && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-[#00967c]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Or Verification / Source URL
            </h4>
          </div>
          <div className="flex gap-2">
            <Input
              name="sourceUrlInput"
              placeholder="https://www.credly.com/org/aws/badge/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUrlSubmit}
              disabled={isUploading || !urlInput.trim()}
            >
              Save URL
            </Button>
          </div>
        </div>
      )}

      {(localError ?? externalError) ? (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{localError ?? externalError}</span>
        </div>
      ) : null}
    </div>
  );
}
