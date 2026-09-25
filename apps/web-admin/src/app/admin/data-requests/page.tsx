'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminDataRequestDto, DataRequestStatus, DataRequestType } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { FileLock } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  Field,
  FilterBar,
  InlineAlert,
  NativeSelect,
  PageStack,
  StatusBadge,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

const TYPE_LABEL: Record<DataRequestType, string> = {
  CORRECTION: 'Correction',
  DELETION: 'Deletion',
  EXPORT: 'Export',
};

const SLA_LABEL: Record<AdminDataRequestDto['slaState'], string> = {
  on_track: 'On track',
  response_overdue: 'First response overdue',
  close_overdue: 'Close overdue',
};

function day(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/** S6-VV-116 (#559) — work the data-subject request queue against the 7 / 30 day SLA. */
export default function DataRequestsPage() {
  const [rows, setRows] = useState<AdminDataRequestDto[]>([]);
  const [type, setType] = useState<DataRequestType | ''>('');
  const [status, setStatus] = useState<DataRequestStatus | ''>('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await api.onboarding.listAdminDataRequests({
          type: type || undefined,
          status: status || undefined,
        }),
      );
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not load data requests.');
    } finally {
      setLoading(false);
    }
  }, [type, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(row: AdminDataRequestDto, action: 'review' | 'complete' | 'reject') {
    setError(null);
    if (action !== 'review' && note.trim().length < 8) {
      setError('Write a note of at least 8 characters. The student will see it.');
      return;
    }
    setBusyId(row.id);
    try {
      if (action === 'review') await api.onboarding.startDataRequestReview(row.id);
      else await api.onboarding.resolveDataRequest(row.id, action, { note: note.trim() });
      if (action !== 'review') setNote('');
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update this request.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={FileLock}
        title="Data requests"
        description="Students' correction, deletion and export requests. Respond within 7 days and close within 30."
      />

      <FilterBar>
        <Field label="Type">
          <NativeSelect
            value={type}
            onChange={(e) => setType(e.target.value as DataRequestType | '')}
          >
            <option value="">All types</option>
            {(Object.keys(TYPE_LABEL) as DataRequestType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value as DataRequestStatus | '')}
          >
            <option value="">Open queue</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In review</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </NativeSelect>
        </Field>
        <Field label="Note to the student (required to complete or reject)" className="min-w-72">
          <AdminInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Corrected your graduation year to 2027."
          />
        </Field>
      </FilterBar>

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {loading ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : (
        <DataTable
          headers={['Requested', 'Student', 'Type', 'Details', 'Status', 'SLA', 'Action']}
          empty={rows.length === 0}
          emptyIcon={FileLock}
        >
          {rows.map((row) => {
            const open = row.status === 'OPEN' || row.status === 'IN_REVIEW';
            const manual = row.type !== 'EXPORT';
            return (
              <TableRow key={row.id}>
                <TableCell>{day(row.createdAt)}</TableCell>
                <TableCell>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.userFullName}
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400">{row.userEmail}</div>
                </TableCell>
                <TableCell>{TYPE_LABEL[row.type]}</TableCell>
                <TableCell className="max-w-xs whitespace-normal">
                  {row.details || '—'}
                  {row.resolution ? (
                    <div className="mt-1 text-zinc-500">Note: {row.resolution}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status.replace('_', ' ')} />
                </TableCell>
                <TableCell>
                  <div className={row.slaState === 'on_track' ? '' : 'font-semibold text-rose-700'}>
                    {SLA_LABEL[row.slaState]}
                  </div>
                  {open ? (
                    <div className="text-zinc-500">
                      {row.firstRespondedAt ? '' : `Respond by ${day(row.respondBy)} · `}
                      Close by {day(row.closeBy)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {open && manual ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.status === 'OPEN' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => void act(row, 'review')}
                        >
                          Start review
                        </Button>
                      ) : null}
                      {row.type === 'CORRECTION' ? (
                        <Button
                          size="sm"
                          disabled={busyId === row.id}
                          onClick={() => void act(row, 'complete')}
                        >
                          Complete
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => void act(row, 'reject')}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-zinc-400">
                      {row.type === 'EXPORT' ? 'Automatic' : '—'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      )}
    </PageStack>
  );
}
