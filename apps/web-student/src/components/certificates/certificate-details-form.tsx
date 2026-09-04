'use client';

import { useState } from 'react';
import { Button, Input } from '@smart/ui';

interface CertificateDetailsFormProps {
  onSubmit: (details: { title: string; issuer: string }) => void;
  isPending?: boolean;
  error?: string | null;
}

export function CertificateDetailsForm({
  onSubmit,
  isPending,
  error,
}: CertificateDetailsFormProps) {
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [touched, setTouched] = useState(false);

  const titleError =
    touched && title.trim().length < 3 ? 'Enter the certificate title.' : undefined;
  const issuerError = touched && issuer.trim().length < 2 ? 'Enter who issued it.' : undefined;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium text-white">Certificate Details</h2>
        <p className="mt-1 text-sm text-white/45">Tell us what you earned and who issued it.</p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Certificate Title"
          name="title"
          placeholder="AWS Certified Cloud Practitioner"
          value={title}
          error={titleError}
          disabled={isPending}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Input
          label="Issued By"
          name="issuer"
          placeholder="Amazon Web Services"
          value={issuer}
          error={issuerError}
          disabled={isPending}
          onChange={(event) => setIssuer(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            setTouched(true);
            if (title.trim().length < 3 || issuer.trim().length < 2) return;
            onSubmit({ title: title.trim(), issuer: issuer.trim() });
          }}
        >
          {isPending ? 'Continuing…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
