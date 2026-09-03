'use client';

import { useEffect, useState } from 'react';
import type { VerificationQueueItemDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { BadgeCheck, CircleCheck, X } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function VerificationPage() {
  const [items, setItems] = useState<VerificationQueueItemDto[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api.onboarding.verificationQueue());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load verification queue.'));
  }, []);

  async function resolve(item: VerificationQueueItemDto, decision: 'APPROVED' | 'REJECTED') {
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    try {
      await api.onboarding.resolveVerification(item.tenantId, {
        tenantType: item.tenantType,
        decision,
        reason: reason.trim(),
      });
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not resolve.');
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={BadgeCheck}
        tone="teal"
        title="Verification queue"
        description="Approve or reject self-onboarded institutions and companies. Approval can unlock Pro."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Decision reason</CardTitle>
          <CardDescription>Required for approve and reject. Minimum 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Reason">
            <AdminInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
        </CardContent>
      </Card>
      {items.length === 0 ? (
        <EmptyState icon={BadgeCheck}>Queue is empty.</EmptyState>
      ) : (
        <DataTable headers={['Tenant', 'Type', 'Status', 'Actions']}>
          {items.map((item) => (
            <TableRow key={`${item.tenantType}-${item.tenantId}`}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
                <div className="text-card-foreground/70">{item.domain}</div>
              </TableCell>
              <TableCell>{item.tenantType}</TableCell>
              <TableCell>{item.verificationStatus}</TableCell>
              <TableCell className="space-x-2">
                <Button type="button" size="sm" onClick={() => void resolve(item, 'APPROVED')}>
                  <CircleCheck data-icon="inline-start" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void resolve(item, 'REJECTED')}
                >
                  <X data-icon="inline-start" />
                  Reject
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
