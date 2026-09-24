'use client';

import { useEffect, useState } from 'react';
import type { FlaggedOrganizationDto, IntegrityQueueItemDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import {
  Ban,
  Building2,
  CheckCircle2,
  CircleCheck,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@smart/ui/tabs';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  Field,
  InlineAlert,
  PageStack,
  SeverityBadge,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

export default function IntegrityPage() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ESCALATED' | 'ORGANIZATIONS'>('PENDING');
  const [items, setItems] = useState<IntegrityQueueItemDto[]>([]);
  const [flaggedOrgs, setFlaggedOrgs] = useState<FlaggedOrganizationDto[]>([]);
  const [_selectedFlag, _setSelectedFlag] = useState<IntegrityQueueItemDto | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [_loading, setLoading] = useState(true);

  async function loadData(tab: 'PENDING' | 'ESCALATED' | 'ORGANIZATIONS') {
    setLoading(true);
    try {
      if (tab === 'ORGANIZATIONS') {
        const orgs = await api.onboarding.flaggedOrganizations();
        setFlaggedOrgs(orgs ?? []);
      } else {
        const data = await api.onboarding.integrityQueue(tab);
        setItems(data ?? []);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to load integrity queue from database.'));
      if (tab === 'ORGANIZATIONS') setFlaggedOrgs([]);
      else setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(activeTab).catch(() => {});
  }, [activeTab]);

  async function resolve(attemptId: string, resolution: 'CLEAR' | 'VOID' | 'ESCALATE') {
    if (reason.trim().length < 8) {
      setError('Enter a decision reason of at least 8 characters for the audit log.');
      return;
    }
    setError(null);
    try {
      await api.onboarding.resolveIntegrity(attemptId, {
        resolution,
        reason: reason.trim(),
      });
      setNotice(
        resolution === 'CLEAR'
          ? 'Flag dismissed. Score restored and credentials unblocked.'
          : resolution === 'VOID'
            ? 'Flag confirmed. Endorsements suspended and attempt voided.'
            : 'Attempt escalated for senior review committee.',
      );

      setReason('');
      await loadData(activeTab);
    } catch (err) {
      setError(formatApiError(err, 'Resolve failed.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={ShieldAlert}
        tone="inverse"
        title="Trust & Safety Review Queue"
        description="Review proctoring anomalies, audio defense flags, and manage endorsement suspension directly in PostgreSQL."
      />

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {notice ? (
        <div className="flex items-center justify-between rounded-md border border-zinc-200/80 bg-zinc-50 p-3.5 text-sm text-zinc-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-900" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'PENDING' | 'ESCALATED' | 'ORGANIZATIONS')}
      >
        <TabsList>
          <TabsTrigger value="PENDING">
            <ShieldAlert />
            Pending Review
          </TabsTrigger>
          <TabsTrigger value="ESCALATED">
            <TriangleAlert />
            Escalated Cases
          </TabsTrigger>
          <TabsTrigger value="ORGANIZATIONS">
            <Building2 />
            Flagged Organizations
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab !== 'ORGANIZATIONS' ? (
        <Card>
          <CardHeader>
            <CardTitle>Decision Reason / Review Notes</CardTitle>
            <CardDescription>
              Required for dismiss, void (suspend), and escalate actions. Minimum 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Review Rationale">
              <AdminInput
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Reviewed proctor video recording and confirmed clean room environment."
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h3 className="font-heading text-sm font-bold tracking-tight text-zinc-900">
              {activeTab === 'ORGANIZATIONS'
                ? 'Flagged & Suspended Organizations'
                : 'Live Integrity Flags from Database'}
            </h3>
            <p className="text-xs text-zinc-500">
              {activeTab === 'ORGANIZATIONS'
                ? 'Held, rejected, or deactivated universities and employer accounts.'
                : activeTab === 'PENDING'
                  ? 'Pending candidate assessment flags requiring review.'
                  : 'Escalated integrity anomalies for committee review.'}
            </p>
          </div>
          <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-700">
            {activeTab === 'ORGANIZATIONS'
              ? `${flaggedOrgs.length} ${flaggedOrgs.length === 1 ? 'organization' : 'organizations'}`
              : `${items.length} ${items.length === 1 ? 'flag' : 'flags'}`}
          </span>
        </div>

        {activeTab === 'ORGANIZATIONS' ? (
          <DataTable
            headers={['Organization', 'Type', 'Category', 'Status', 'Flagged Date']}
            empty={flaggedOrgs.length === 0}
            emptyIcon={ShieldCheck}
          >
            {flaggedOrgs.map((org) => (
              <TableRow key={org.organizationId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                      <Building2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 text-xs">{org.name}</div>
                      <div className="truncate text-[11px] text-zinc-500">
                        {org.domain ?? 'No domain'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-800 capitalize">
                    {org.tenantType}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800">
                    {org.category}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                    {org.status}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-zinc-600 font-mono">
                  {new Date(org.flaggedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        ) : (
          <DataTable
            headers={['Candidate', 'Integrity Flag', 'Risk Severity', 'Anomaly Details', 'Actions']}
            empty={items.length === 0}
            emptyIcon={ShieldCheck}
          >
            {items.map((item) => {
              const initials =
                item.studentName
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'ST';

              return (
                <TableRow key={item.attemptId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-900 text-xs font-bold text-white shadow-2xs">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 text-xs">{item.studentName}</div>
                        <div className="truncate text-[11px] text-zinc-500">
                          {item.studentEmail}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-bold text-zinc-800">
                      {item.integrityFlag}
                    </span>
                  </TableCell>

                  <TableCell>
                    <SeverityBadge severity={item.severity} />
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-zinc-600 max-w-sm truncate block">
                      {item.flagReason || 'Proctoring algorithm anomaly detected'}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs gap-1"
                        onClick={() => void resolve(item.attemptId, 'CLEAR')}
                      >
                        <CircleCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Dismiss
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2.5 text-[11px] font-semibold shadow-2xs gap-1"
                        onClick={() => void resolve(item.attemptId, 'VOID')}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Suspend
                      </Button>
                      {item.integrityFlag !== 'ESCALATED' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 border border-zinc-200 bg-zinc-100 px-2.5 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-200 shadow-2xs gap-1"
                          onClick={() => void resolve(item.attemptId, 'ESCALATE')}
                        >
                          <TriangleAlert className="h-3.5 w-3.5" />
                          Escalate
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        )}
      </div>
    </PageStack>
  );
}
