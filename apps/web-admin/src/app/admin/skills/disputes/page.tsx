'use client';

import { useEffect, useState } from 'react';
import type { EvidenceSkillDisputeRow } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { Flag, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
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

export default function EvidenceDisputesPage() {
  const [disputes, setDisputes] = useState<EvidenceSkillDisputeRow[]>([]);
  const [selected, setSelected] = useState<EvidenceSkillDisputeRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const items = await api.evidence.listAdminEvidenceSkillDisputes();
      setDisputes(items);
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load evidence dispute queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleResolve(resolution: 'ACCEPTED' | 'REJECTED') {
    if (!selected) return;
    if (reviewNote.trim().length < 5) {
      setError('Please provide a review note of at least 5 characters.');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await api.evidence.resolveAdminEvidenceSkillDispute(selected.id, {
        resolution,
        reviewNote: reviewNote.trim(),
      });
      setSuccess(
        `Dispute for ${selected.skillCode} marked ${resolution === 'ACCEPTED' ? 'Accepted' : 'Rejected'}.`,
      );
      setSelected(null);
      setReviewNote('');
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Failed to resolve dispute.');
    }
  }

  return (
    <PageStack>
      <PageHeader
        title="Evidence Dispute Queue"
        description="Review student disputes on automated evidence-to-skill mappings and calibrate inference outcomes (I319 / I564)."
      >
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      {error && <InlineAlert tone="danger" title={error} />}
      {success && <InlineAlert tone="info" title={success} />}

      <DataTable headers={['Submitted', 'Skill Code', 'Student ID', 'Status', 'Reason', 'Actions']}>
        {disputes.length === 0 && !loading ? (
          <TableRow>
            <TableCell colSpan={6}>
              <EmptyState icon={Flag}>
                All student evidence-to-skill inference disputes have been adjudicated.
              </EmptyState>
            </TableCell>
          </TableRow>
        ) : (
          disputes.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="font-mono text-xs font-semibold">{row.skillCode}</TableCell>
              <TableCell className="font-mono text-xs text-zinc-500">
                {row.studentId.slice(0, 8)}...
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    row.status === 'UNDER_REVIEW'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : row.status === 'RESOLVED_ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {row.status}
                </span>
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs">{row.reason}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelected(row);
                    setReviewNote(row.reviewNote || '');
                    setError(null);
                  }}
                >
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>

      {selected && (
        <Card className="mt-6 border-zinc-200 shadow-md dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Adjudicate Dispute: {selected.skillCode}</CardTitle>
            <CardDescription>
              Review the student explanation and decide whether to accept or reject the inferred
              skill claim dispute.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Dispute ID">
              <span className="font-mono text-xs">{selected.id}</span>
            </Field>
            <Field label="Student Reason">
              <p className="text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-50 p-3 rounded-md border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                {selected.reason}
              </p>
            </Field>
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Reviewer Adjudication Note (min 5 characters)
              </label>
              <AdminInput
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter justification for accept or reject decision..."
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="default"
                onClick={() => void handleResolve('ACCEPTED')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="size-4 mr-1.5" />
                Accept Dispute
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleResolve('REJECTED')}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <XCircle className="size-4 mr-1.5" />
                Reject Dispute
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageStack>
  );
}
