'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { isSmartApiError } from '@smart/api-client';
import type { CompanyDto, PlanCode } from '@smart/contracts';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  Field,
  FormActions,
  FormGrid,
  InlineAlert,
  NativeSelect,
  PageStack,
  StatusBadge,
  controlButtonClassName,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function CompanyDetailPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;
  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editPlan, setEditPlan] = useState<PlanCode>('FREE');
  const [sector, setSector] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const row = await api.onboarding.getCompany(companyId);
    setCompany(row);
    setEditName(row.name);
    setEditDomain(row.domain ?? '');
    setEditPlan(row.planCode);
    setSector(row.sector ?? '');
  }

  useEffect(() => {
    load().catch((err) => setError(isSmartApiError(err) ? err.message : 'Failed to load company.'));
  }, [companyId]);

  if (!company) {
    return error ? (
      <InlineAlert tone="danger" title={error} />
    ) : (
      <p className="text-sm text-muted-foreground">Loading…</p>
    );
  }

  const status = company.deactivatedAt ? 'Deactivated' : company.heldAt ? 'On hold' : 'Active';

  return (
    <PageStack>
      <PageHeader
        icon={Building2}
        title={company.name}
        description={`${company.planCode} · ${company.verificationStatus}`}
      >
        <Button variant="outline" asChild>
          <Link href="/admin/companies">
            <ArrowLeft data-icon="inline-start" />
            Back to companies
          </Link>
        </Button>
      </PageHeader>
      <StatusBadge status={status} />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Name, industry domain, sector, and plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                try {
                  await api.onboarding.updateCompany(companyId, {
                    name: editName,
                    domain: editDomain.trim() || null,
                    planCode: editPlan,
                    sector: sector || null,
                  });
                  await load();
                } catch (err) {
                  setError(isSmartApiError(err) ? err.message : 'Update failed.');
                }
              })();
            }}
          >
            <FormGrid>
              <Field label="Name">
                <AdminInput value={editName} onChange={(e) => setEditName(e.target.value)} />
              </Field>
              <Field label="Industry domain">
                <AdminInput
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                  placeholder="Software/IT"
                />
              </Field>
              <Field label="Sector">
                <AdminInput value={sector} onChange={(e) => setSector(e.target.value)} />
              </Field>
              <Field label="Plan">
                <NativeSelect
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as PlanCode)}
                >
                  <option value="FREE">FREE</option>
                  <option value="BASIC">BASIC</option>
                  <option value="PRO">PRO</option>
                </NativeSelect>
              </Field>
              <FormActions>
                <Button type="submit" className={controlButtonClassName}>
                  Save
                </Button>
              </FormActions>
            </FormGrid>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Access controls</CardTitle>
          <CardDescription>Hold or deactivate this company. A reason is required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Reason (hold / deactivate)">
            <AdminInput value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void (async () => {
                  if (reason.trim().length < 8) {
                    setError('Enter a reason of at least 8 characters.');
                    return;
                  }
                  try {
                    if (company.heldAt) {
                      await api.onboarding.releaseCompanyHold(companyId, { reason: reason.trim() });
                    } else {
                      await api.onboarding.holdCompany(companyId, { reason: reason.trim() });
                    }
                    await load();
                  } catch (err) {
                    setError(isSmartApiError(err) ? err.message : 'Hold update failed.');
                  }
                })();
              }}
            >
              {company.heldAt ? 'Release hold' : 'Hold'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void (async () => {
                  if (reason.trim().length < 8) {
                    setError('Enter a reason of at least 8 characters.');
                    return;
                  }
                  try {
                    if (company.deactivatedAt) {
                      await api.onboarding.restoreCompany(companyId, { reason: reason.trim() });
                    } else {
                      await api.onboarding.deactivateCompany(companyId, { reason: reason.trim() });
                    }
                    await load();
                  } catch (err) {
                    setError(isSmartApiError(err) ? err.message : 'Status update failed.');
                  }
                })();
              }}
            >
              {company.deactivatedAt ? 'Restore' : 'Deactivate'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageStack>
  );
}
