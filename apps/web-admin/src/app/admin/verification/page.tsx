'use client';

import { useEffect, useState } from 'react';
import type {
  CompanyVerificationReviewDetailDto,
  VerificationQueueItemDto,
} from '@smart/contracts';
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
  const [selected, setSelected] = useState<VerificationQueueItemDto | null>(null);
  const [detail, setDetail] = useState<CompanyVerificationReviewDetailDto | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api.onboarding.verificationQueue());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load verification queue.'));
  }, []);

  async function openCompanyReview(item: VerificationQueueItemDto) {
    if (item.tenantType !== 'company') {
      setSelected(item);
      setDetail(null);
      return;
    }
    setSelected(item);
    setError(null);
    try {
      setDetail(await api.onboarding.companyVerificationReview(item.tenantId));
    } catch (err) {
      setDetail(null);
      setError(isSmartApiError(err) ? err.message : 'Could not load company review details.');
    }
  }

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
        submissionId: item.submissionId,
      });
      setSelected(null);
      setDetail(null);
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
        <DataTable headers={['Tenant', 'Type', 'Status', 'Submission', 'Actions']}>
          {items.map((item) => (
            <TableRow key={`${item.tenantType}-${item.tenantId}`}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
                <div className="text-card-foreground/70">{item.domain}</div>
                {item.tenantType === 'company' && item.representativeEmail ? (
                  <div className="text-card-foreground/70 text-sm">{item.representativeEmail}</div>
                ) : null}
              </TableCell>
              <TableCell>{item.tenantType}</TableCell>
              <TableCell>{item.verificationStatus}</TableCell>
              <TableCell>
                {item.tenantType === 'company' ? (
                  <div className="text-sm">
                    {item.documentCount ?? 0} docs
                    {item.submittedAt ? (
                      <div className="text-card-foreground/70">{item.submittedAt}</div>
                    ) : null}
                  </div>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void openCompanyReview(item)}
                >
                  Review
                </Button>
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
      {selected?.tenantType === 'company' && detail ? (
        <Card>
          <CardHeader>
            <CardTitle>{detail.legalName}</CardTitle>
            <CardDescription>
              Submission {detail.submissionId} · {detail.registrationCountry ?? '—'} ·{' '}
              {detail.documents.length} documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.documents.length === 0 ? (
              <p className="text-sm text-card-foreground/70">No documents uploaded yet.</p>
            ) : (
              detail.documents.map((doc) => (
                <div
                  key={doc.documentId}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"
                >
                  <div>
                    <div className="font-medium">{doc.fileName}</div>
                    <div className="text-sm text-card-foreground/70">
                      {doc.documentType} · {doc.reviewStatus}
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </PageStack>
  );
}
