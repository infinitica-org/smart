'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';

export default function Page() {
  const router = useRouter();
  const [certId, setCertId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanId = certId.trim();
    if (!cleanId) {
      setError('Certificate ID is required');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanId)) {
      setError('Please enter a valid Certificate ID format (UUID)');
      return;
    }

    setError('');
    router.push(`/cert/${cleanId}`);
  };

  return (
    <div className="mx-auto max-w-lg py-12 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>Verify a Credential</CardTitle>
          <CardDescription>
            Enter a cryptographically signed Certificate ID below to view the competency levels validated by SMART.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6">
          <Input
            label="Certificate ID (UUID)"
            placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            value={certId}
            onChange={(e) => {
              setCertId(e.target.value);
              if (error) setError('');
            }}
            error={error}
            required
          />
          <Button type="submit" fullWidth>
            Verify Certificate
          </Button>
        </form>
      </Card>
    </div>
  );
}
