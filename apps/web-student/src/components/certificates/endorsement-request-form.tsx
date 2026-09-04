'use client';

import { useState } from 'react';
import { isDisallowedEndorserEmailDomain } from '@smart/contracts';
import { Button, Input } from '@smart/ui';

interface EndorsementRequestFormProps {
  onSubmit: (details: {
    endorserName: string;
    endorserEmail: string;
    endorserTitle?: string;
  }) => void;
  isPending?: boolean;
  error?: string | null;
}

export function EndorsementRequestForm({
  onSubmit,
  isPending,
  error,
}: EndorsementRequestFormProps) {
  const [endorserName, setEndorserName] = useState('');
  const [endorserEmail, setEndorserEmail] = useState('');
  const [endorserTitle, setEndorserTitle] = useState('');
  const [touched, setTouched] = useState(false);

  const nameError = touched && endorserName.trim().length < 2 ? 'Enter their name.' : undefined;
  const emailError =
    touched && !endorserEmail.includes('@')
      ? 'Enter a valid email address.'
      : touched && isDisallowedEndorserEmailDomain(endorserEmail)
        ? 'Use their work email, not a personal email provider.'
        : undefined;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div>
        <h3 className="text-sm font-semibold text-white">Request Endorsement</h3>
        <p className="mt-1 text-xs text-white/45">
          Name someone who can vouch for this certificate. They&apos;ll get an email with a link to
          review it — no account required. Their email must be a work address, not a personal one.
        </p>
      </div>

      <Input
        label="Endorser's name"
        name="endorserName"
        value={endorserName}
        error={nameError}
        disabled={isPending}
        onChange={(event) => setEndorserName(event.target.value)}
      />
      <Input
        label="Endorser's work email"
        name="endorserEmail"
        type="email"
        placeholder="jane@company.com"
        value={endorserEmail}
        error={emailError}
        disabled={isPending}
        onChange={(event) => setEndorserEmail(event.target.value)}
      />
      <Input
        label="Their title (optional)"
        name="endorserTitle"
        placeholder="Manager, Professor, etc."
        value={endorserTitle}
        disabled={isPending}
        onChange={(event) => setEndorserTitle(event.target.value)}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            setTouched(true);
            if (
              endorserName.trim().length < 2 ||
              !endorserEmail.includes('@') ||
              isDisallowedEndorserEmailDomain(endorserEmail)
            ) {
              return;
            }
            onSubmit({
              endorserName: endorserName.trim(),
              endorserEmail: endorserEmail.trim(),
              endorserTitle: endorserTitle.trim() || undefined,
            });
          }}
        >
          {isPending ? 'Sending…' : 'Request Endorsement'}
        </Button>
      </div>
    </div>
  );
}
