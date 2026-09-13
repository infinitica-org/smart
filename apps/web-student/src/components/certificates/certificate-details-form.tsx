'use client';

import { useState } from 'react';
import { Button, Input } from '@smart/ui';
import { Award } from 'lucide-react';

export interface CertificateDetailsPayload {
  title: string;
  issuer: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationUrl?: string;
}

interface CertificateDetailsFormProps {
  initialValues?: Partial<CertificateDetailsPayload>;
  onSubmit: (details: CertificateDetailsPayload) => void;
  isPending?: boolean;
  error?: string | null;
  submitLabel?: string;
}

export function CertificateDetailsForm({
  initialValues,
  onSubmit,
  isPending,
  error,
  submitLabel = 'Continue to Next Step',
}: CertificateDetailsFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [issuer, setIssuer] = useState(initialValues?.issuer ?? '');
  const [certificateNumber, setCertificateNumber] = useState(
    initialValues?.certificateNumber ?? '',
  );
  const [issueDate, setIssueDate] = useState(initialValues?.issueDate ?? '');
  const [expiryDate, setExpiryDate] = useState(initialValues?.expiryDate ?? '');
  const [verificationUrl, setVerificationUrl] = useState(initialValues?.verificationUrl ?? '');
  const [touched, setTouched] = useState(false);

  const titleError =
    touched && title.trim().length < 3
      ? 'Enter the certificate title (at least 3 characters).'
      : undefined;
  const issuerError =
    touched && issuer.trim().length < 2
      ? 'Enter the issuing provider (e.g. AWS, Coursera).'
      : undefined;

  let urlError: string | undefined;
  if (touched && verificationUrl.trim().length > 0) {
    try {
      new URL(verificationUrl.trim());
    } catch {
      urlError = 'Enter a valid URL starting with http:// or https://';
    }
  }

  const handleSubmit = () => {
    setTouched(true);
    if (title.trim().length < 3 || issuer.trim().length < 2 || urlError) {
      return;
    }
    onSubmit({
      title: title.trim(),
      issuer: issuer.trim(),
      certificateNumber: certificateNumber.trim() || undefined,
      issueDate: issueDate.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      verificationUrl: verificationUrl.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Award className="h-5 w-5 text-[#00967c]" /> Certificate Details
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter provider name, credential details, and valid verification link.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Certification Provider (Issuer) *"
            name="issuer"
            placeholder="e.g. Amazon Web Services, Coursera, Google"
            value={issuer}
            error={issuerError}
            disabled={isPending}
            onChange={(event) => setIssuer(event.target.value)}
          />
          <Input
            label="Certification Name (Title) *"
            name="title"
            placeholder="e.g. AWS Certified Solutions Architect"
            value={title}
            error={titleError}
            disabled={isPending}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Input
              label="Certificate Number"
              name="certificateNumber"
              placeholder="AWS-12345678"
              value={certificateNumber}
              disabled={isPending}
              onChange={(event) => setCertificateNumber(event.target.value)}
            />
          </div>
          <div>
            <Input
              label="Issue Date"
              name="issueDate"
              type="date"
              placeholder="YYYY-MM-DD"
              value={issueDate}
              disabled={isPending}
              onChange={(event) => setIssueDate(event.target.value)}
            />
          </div>
          <div>
            <Input
              label="Valid Through / Expiry Date"
              name="expiryDate"
              type="date"
              placeholder="YYYY-MM-DD"
              value={expiryDate}
              disabled={isPending}
              onChange={(event) => setExpiryDate(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Input
            label="Direct Verification / Source URL"
            name="verificationUrl"
            placeholder="https://www.credly.com/org/aws/badge/..."
            value={verificationUrl}
            error={urlError}
            disabled={isPending}
            onChange={(event) => setVerificationUrl(event.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Provide a direct public link (Credly, CertMetrics, issuer badge) for instant automated
            source verification.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          {error}
        </div>
      ) : null}

      <div className="pt-2">
        <Button
          type="button"
          disabled={isPending}
          className="w-full sm:w-auto"
          onClick={handleSubmit}
        >
          {isPending ? 'Saving Details…' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
