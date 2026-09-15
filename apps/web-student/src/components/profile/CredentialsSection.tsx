'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BadgeCheck, FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import {
  CREDENTIAL_TYPES,
  type CredentialType,
  type ProfessionalCredentialDto,
} from '@smart/contracts';
import { api } from '@/lib/api';

// DEGREE is intentionally not offered here: CandidateEducation already owns
// degree verification, and this pipeline never resolves that type.
const SELECTABLE_CREDENTIAL_TYPES = CREDENTIAL_TYPES.filter((type) => type !== 'DEGREE');

const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  CERTIFICATION: 'Certification',
  LICENSE: 'License',
  DEGREE: 'Degree',
  BADGE: 'Badge',
  PROFESSIONAL_MEMBERSHIP: 'Professional membership',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PENDING_VERIFICATION: 'border-amber-200 bg-amber-50 text-amber-900',
  EXPIRED: 'border-border bg-muted text-muted-foreground',
  REVOKED: 'border-red-200 bg-red-50 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Verified',
  PENDING_VERIFICATION: 'Pending verification',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** The object key is `credential-documents/{studentId}/{uuid}-{original file name}` — strip the
 * storage prefix and the uuid so the student sees the name they actually picked. */
function fileNameFromObjectKey(objectKey: string): string {
  const last = objectKey.split('/').pop() ?? objectKey;
  const withoutUuidPrefix = last.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/iu,
  );
  return withoutUuidPrefix?.[1] ?? last;
}

type DocumentPreview = {
  objectUrl: string;
  fileName: string;
  isImage: boolean;
};

type NewCredentialForm = {
  issuer: string;
  credentialName: string;
  credentialType: CredentialType;
  externalCredentialId: string;
  verificationSource: string;
};

function emptyForm(): NewCredentialForm {
  return {
    issuer: '',
    credentialName: '',
    credentialType: 'CERTIFICATION',
    externalCredentialId: '',
    verificationSource: '',
  };
}

export function CredentialsSection() {
  const [credentials, setCredentials] = useState<ProfessionalCredentialDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewCredentialForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [documentPreviews, setDocumentPreviews] = useState<Record<string, DocumentPreview>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const documentUrlsRef = useRef<Record<string, string>>({});

  // Object URLs are only valid for this tab's lifetime — release them on unmount.
  useEffect(() => {
    return () => {
      for (const url of Object.values(documentUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const loadCredentials = async () => {
    try {
      setError(null);
      const rows = await api.evidence.listCredentials();
      setCredentials(rows);
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not load credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCredentials();
  }, []);

  const handleCreate = async () => {
    if (!form.issuer.trim() || !form.credentialName.trim()) {
      setError('Issuer and credential name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.evidence.createCredential({
        issuer: form.issuer.trim(),
        credentialName: form.credentialName.trim(),
        credentialType: form.credentialType,
        externalCredentialId: form.externalCredentialId.trim() || undefined,
        verificationSource: form.verificationSource.trim() || undefined,
      });
      setForm(emptyForm());
      setShowForm(false);
      await loadCredentials();
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not add credential.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (credentialId: string, file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Use a PDF, JPG, or PNG file for the supporting document.');
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError('The supporting document must be 5MB or smaller.');
      return;
    }
    setUploadingId(credentialId);
    setError(null);
    try {
      await api.evidence.uploadCredentialDocument(credentialId, file, file.name);

      const previousUrl = documentUrlsRef.current[credentialId];
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      const objectUrl = URL.createObjectURL(file);
      documentUrlsRef.current[credentialId] = objectUrl;
      setDocumentPreviews((current) => ({
        ...current,
        [credentialId]: { objectUrl, fileName: file.name, isImage: file.type.startsWith('image/') },
      }));

      await loadCredentials();
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Document upload failed.');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="credentials-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="credentials-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Professional credentials
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Licenses, certifications, badges, and professional memberships. We attempt automated
            verification against the issuer; unresolved claims stay pending.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          {showForm ? 'Cancel' : 'Add credential'}
        </button>
      </div>

      {error ? (
        <p className="inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {showForm ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/50 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground/80">Issuer</span>
              <input
                type="text"
                value={form.issuer}
                onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                placeholder="e.g. Amazon Web Services"
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground/80">Credential name</span>
              <input
                type="text"
                value={form.credentialName}
                onChange={(e) => setForm((f) => ({ ...f, credentialName: e.target.value }))}
                placeholder="e.g. AWS Certified Solutions Architect"
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground/80">Type</span>
              <select
                value={form.credentialType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credentialType: e.target.value as CredentialType }))
                }
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                {SELECTABLE_CREDENTIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CREDENTIAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground/80">Credential / license number</span>
              <input
                type="text"
                value={form.externalCredentialId}
                onChange={(e) => setForm((f) => ({ ...f, externalCredentialId: e.target.value }))}
                placeholder="Optional"
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium text-foreground/80">Public verification URL</span>
              <input
                type="url"
                value={form.verificationSource}
                onChange={(e) => setForm((f) => ({ ...f, verificationSource: e.target.value }))}
                placeholder="Optional — the issuer's public lookup page for this credential"
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleCreate()}
              className="inline-flex items-center gap-2 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Adding…' : 'Add credential'}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading credentials…</p>
      ) : credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <BadgeCheck className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground/80">No credentials added yet</p>
          <p className="text-xs text-muted-foreground">
            Add a license, certification, or membership to have it verified.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {credentials.map((credential) => {
            const busy = uploadingId === credential.credentialId;
            return (
              <div
                key={credential.credentialId}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{credential.credentialName}</h3>
                    <p className="text-sm text-foreground/80">Issuer: {credential.issuer}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                      STATUS_BADGE_STYLES[credential.status] ??
                      'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {STATUS_LABELS[credential.status] ?? credential.status}
                  </span>
                </div>

                {(() => {
                  const preview = documentPreviews[credential.credentialId];
                  const fileName =
                    preview?.fileName ??
                    (credential.documentObjectKey
                      ? fileNameFromObjectKey(credential.documentObjectKey)
                      : null);
                  if (!fileName) return null;
                  return (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5">
                      {preview?.isImage ? (
                        <img
                          src={preview.objectUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <p className="truncate text-xs text-foreground/80">{fileName}</p>
                    </div>
                  );
                })()}

                {credential.status === 'PENDING_VERIFICATION' ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputRefs.current[credential.credentialId]?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {credential.documentObjectKey
                          ? 'Replace supporting document'
                          : 'Upload supporting document'}
                      </button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[credential.credentialId] = el;
                        }}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleUpload(credential.credentialId, file);
                          event.target.value = '';
                        }}
                      />
                    </div>
                    <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00967c]" />
                      we&apos;re checking this behind the scenes rn — all verification runs on our
                      backend, zero vibes-based approval. we&apos;ll flip this the second it&apos;s
                      confirmed, no need to refresh.
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
