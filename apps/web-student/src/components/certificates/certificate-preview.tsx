import { CheckCircle2 } from 'lucide-react';

interface CertificatePreviewProps {
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  onReplace: () => void;
}

export function CertificatePreview({
  fileUrl,
  fileName,
  mimeType,
  onReplace,
}: CertificatePreviewProps) {
  const isImage = mimeType?.startsWith('image/') ?? false;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-white">Certificate</h3>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        {isImage ? (
          // Signed, per-request MinIO URLs — next/image's remote-host allowlist doesn't fit a dynamic host.
          <img src={fileUrl} alt={fileName} className="max-h-80 w-full object-contain" />
        ) : (
          <iframe src={fileUrl} title={fileName} className="h-80 w-full" />
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-white/70">
        <CheckCircle2 className="h-4 w-4 text-success" />
        {fileName}
      </div>
      <button
        type="button"
        onClick={onReplace}
        className="self-start rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/5"
      >
        Replace Certificate
      </button>
    </div>
  );
}
