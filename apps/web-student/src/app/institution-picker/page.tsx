'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, Button, Card, CardHeader, CardTitle, CardDescription, Alert } from '@smart/ui';

export default function InstitutionPickerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In a real implementation, you'd fetch the user's available institutions via `api.auth.me()`
  // and map them here. Since we're mocking, we'll hardcode the selection for demo purposes.
  const institutions = [
    { id: '1', name: 'PSG College of Technology' },
    { id: '2', name: 'Anna University' },
  ];

  const handleSelect = async (_id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Typically, you'd call an endpoint to set the active institution, or it would be set automatically
      // if only one exists. For this mock flow, we just simulate success and move to /enroll.
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push('/enroll');
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to select institution. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AppShell
      productName="SMART"
      title="Select Institution"
      subtitle="You belong to multiple institutions"
    >
      <div className="mx-auto mt-12 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Pick your institution</CardTitle>
            <CardDescription>
              Choose the institution to proceed with for this session.
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 flex flex-col gap-4">
            {error && (
              <Alert tone="danger" title="Error">
                {error}
              </Alert>
            )}

            {institutions.map((inst) => (
              <Button
                key={inst.id}
                variant="outline"
                onClick={() => handleSelect(inst.id)}
                disabled={loading}
              >
                {inst.name}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
