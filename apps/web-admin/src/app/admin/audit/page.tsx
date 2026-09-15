'use client';

import { useEffect, useRef, useState } from 'react';
import type { AuditLogDto, AuditLogSection } from '@smart/contracts';
import { Filter, ScrollText } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent } from '@smart/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smart/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@smart/ui/sheet';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
  controlButtonClassName,
} from '@/components/admin-ui';
import { api } from '@/lib/api';
import { formatAuditAction, formatResourceType } from '@/lib/audit-actions';

const SECTIONS: { value: AuditLogSection | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'TPO', label: 'TPO' },
  { value: 'SUPER_ADMIN', label: 'Super admin' },
];

interface AuditFilters {
  q: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: AuditFilters = {
  q: '',
  action: '',
  resourceType: '',
  resourceId: '',
  actorId: '',
  from: '',
  to: '',
};

/** Converts a `<input type="date">` value (local, midnight) to an inclusive ISO bound. */
function toIsoBound(dateValue: string, endOfDay: boolean): string | undefined {
  if (!dateValue) return undefined;
  const date = new Date(`${dateValue}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function AuditTable({
  rows,
  onSelect,
}: {
  rows: AuditLogDto[];
  onSelect: (row: AuditLogDto) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={ScrollText}>No matching audit events.</EmptyState>;
  }
  return (
    <DataTable headers={['When', 'Actor', 'Role', 'Action', 'Resource', 'Reason']}>
      {rows.map((row) => (
        <TableRow key={row.auditLogId} className="cursor-pointer" onClick={() => onSelect(row)}>
          <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
          <TableCell>{row.actorEmail ?? '—'}</TableCell>
          <TableCell>{row.actorRole ?? '—'}</TableCell>
          <TableCell className="font-medium">{formatAuditAction(row.action)}</TableCell>
          <TableCell>
            {formatResourceType(row.resourceType)} {row.resourceId?.slice(0, 8)}
          </TableCell>
          <TableCell>{row.reasonCode}</TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}

function MetadataList({ metadata }: { metadata: Record<string, unknown> | null }) {
  const entries = metadata ? Object.entries(metadata) : [];
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No additional details recorded.</p>;
  }
  return (
    <dl className="grid gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-0.5">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {key}
          </dt>
          <dd className="text-sm break-words text-foreground">
            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AuditDetailSheet({
  row,
  onOpenChange,
}: {
  row: AuditLogDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{row ? formatAuditAction(row.action) : ''}</SheetTitle>
          <SheetDescription>{row ? new Date(row.createdAt).toLocaleString() : ''}</SheetDescription>
        </SheetHeader>
        {row ? (
          <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-4">
            <dl className="grid gap-3">
              <div className="grid gap-0.5">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Actor
                </dt>
                <dd className="text-sm text-foreground">
                  {row.actorEmail ?? '—'} {row.actorRole ? `(${row.actorRole})` : ''}
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Raw action
                </dt>
                <dd className="font-mono text-sm break-all text-foreground">{row.action}</dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Resource
                </dt>
                <dd className="font-mono text-sm break-all text-foreground">
                  {row.resourceType} {row.resourceId ?? ''}
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Reason
                </dt>
                <dd className="text-sm break-words text-foreground">{row.reasonCode ?? '—'}</dd>
              </div>
            </dl>
            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">Event details</p>
              <MetadataList metadata={row.metadata} />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default function AuditPage() {
  const [section, setSection] = useState<AuditLogSection | 'ALL'>('ALL');
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogDto | null>(null);

  async function load(nextSection: AuditLogSection | 'ALL', nextFilters: AuditFilters) {
    setRows(
      await api.onboarding.listAuditLogs({
        q: nextFilters.q.trim() || undefined,
        action: nextFilters.action.trim() || undefined,
        resourceType: nextFilters.resourceType.trim() || undefined,
        resourceId: nextFilters.resourceId.trim() || undefined,
        actorId: nextFilters.actorId.trim() || undefined,
        section: nextSection === 'ALL' ? undefined : nextSection,
        from: toIsoBound(nextFilters.from, false),
        to: toIsoBound(nextFilters.to, true),
      }),
    );
  }

  // The last-submitted filters (as opposed to the live form state) so that
  // switching tabs re-applies them without retriggering on every keystroke.
  const appliedFiltersRef = useRef<AuditFilters>(EMPTY_FILTERS);

  useEffect(() => {
    load(section, appliedFiltersRef.current).catch(() => setError('Failed to load audit log.'));
  }, [section]);

  return (
    <PageStack>
      <PageHeader
        icon={ScrollText}
        title="Audit log"
        description="Every hold, verification decision, and candidate profile view is recorded with actor and reason. Rows older than 20 days are purged automatically."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              appliedFiltersRef.current = filters;
              load(section, filters).catch(() => setError('Search failed.'));
            }}
          >
            <FilterBar>
              <Field label="Search">
                <AdminInput
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="Action, reason, or resource ID"
                />
              </Field>
              <Field label="Action">
                <AdminInput
                  value={filters.action}
                  onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
                  placeholder="e.g. institution.held"
                />
              </Field>
              <Field label="Resource type">
                <AdminInput
                  value={filters.resourceType}
                  onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value }))}
                  placeholder="e.g. institution"
                />
              </Field>
              <Field label="Resource ID">
                <AdminInput
                  value={filters.resourceId}
                  onChange={(e) => setFilters((f) => ({ ...f, resourceId: e.target.value }))}
                />
              </Field>
              <Field label="Actor ID">
                <AdminInput
                  value={filters.actorId}
                  onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
                />
              </Field>
              <Field label="From">
                <AdminInput
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                />
              </Field>
              <Field label="To">
                <AdminInput
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                />
              </Field>
              <Button type="submit" variant="outline" className={controlButtonClassName}>
                <Filter data-icon="inline-start" />
                Filter
              </Button>
              {Object.values(filters).some((value) => value !== '') ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={controlButtonClassName}
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    appliedFiltersRef.current = EMPTY_FILTERS;
                    setError(null);
                    load(section, EMPTY_FILTERS).catch(() => setError('Search failed.'));
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </FilterBar>
          </form>
        </CardContent>
      </Card>
      <Tabs
        value={section}
        onValueChange={(value) => {
          setError(null);
          setSection(value as AuditLogSection | 'ALL');
        }}
      >
        <TabsList>
          {SECTIONS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <AuditTable rows={rows} onSelect={setSelected} />
          </TabsContent>
        ))}
      </Tabs>
      <AuditDetailSheet row={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </PageStack>
  );
}
