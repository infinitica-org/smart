'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Cpu,
  Globe,
  Lock,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { BatchDto, PlacementEmployerSummary, TenantEntitlementsDto } from '@smart/contracts';
import { TpoBentoPageHeader } from '../tpo-bento/TpoBentoPageHeader';
import { api, employersApi } from '../../lib/api';
import { normalizeEmailDomain } from '../../lib/domain-validation';
import {
  dismissEmployerFromQueue,
  isValidExtraDomainInput,
  loadAutoApproveInvites,
  loadDismissedEmployerIds,
  loadExtraEmailDomains,
  saveAutoApproveInvites,
  saveExtraEmailDomains,
} from '../../lib/tpo-institution-settings';
import {
  bentoCardClass,
  bentoCardMutedClass,
  bentoChipClass,
  bentoPageStackClass,
  bentoTableBodyRowClass,
  bentoTableCellClass,
  bentoTableClass,
  bentoTableHeadCellClass,
  bentoTableHeadRowClass,
  bentoTableShellClass,
  dashboardErrorNoticeClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
  dashboardPrimaryButtonClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  dashboardSuccessNoticeClass,
} from '../../lib/tpo-dashboard-ui';
import { inputClass, labelClass, secondaryButtonClass } from '../../lib/tpo-ui';
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
        checked
          ? 'border-[#0f9f8f] bg-[#0f9f8f]'
          : 'border-[var(--ds-border)] bg-[var(--ds-surface-muted)]'
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function UniversitySettings() {
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<TenantEntitlementsDto | null>(null);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [employers, setEmployers] = useState<PlacementEmployerSummary[]>([]);
  const [extraDomains, setExtraDomains] = useState<string[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [dismissedEmployerIds, setDismissedEmployerIds] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [campusName, setCampusName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingCampus, setSavingCampus] = useState(false);

  const primaryDomain = entitlements?.domain ?? null;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, ent, batchList, employerRes] = await Promise.all([
        api.auth.me(),
        api.onboarding.tpoEntitlements(),
        api.onboarding.listBatches(),
        employersApi.list().catch(() => ({ employers: [] as PlacementEmployerSummary[] })),
      ]);
      const inst = me.institutionId ?? null;
      setInstitutionId(inst);
      setEntitlements(ent);
      setBatches(batchList);
      setEmployers(employerRes.employers);
      if (inst) {
        setExtraDomains(loadExtraEmailDomains(inst));
        setAutoApprove(loadAutoApproveInvites(inst));
        setDismissedEmployerIds(loadDismissedEmployerIds(inst));
      }
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  function persistExtraDomains(next: string[]) {
    if (!institutionId) return;
    saveExtraEmailDomains(institutionId, next);
    setExtraDomains(next);
  }

  function handleAddDomain() {
    const normalized = normalizeEmailDomain(newDomain);
    if (!isValidExtraDomainInput(newDomain)) {
      setError('Enter a valid domain (e.g. north.riverdale.edu).');
      return;
    }
    if (primaryDomain && normalized === normalizeEmailDomain(primaryDomain)) {
      setError('That domain is already your primary verified domain.');
      return;
    }
    if (extraDomains.includes(normalized)) {
      setError('Domain is already listed.');
      return;
    }
    persistExtraDomains([...extraDomains, normalized]);
    setNewDomain('');
    setNotice('Domain added. Whitelist and provisioning will accept emails on this domain.');
    setError(null);
  }

  function handleRemoveExtra(domain: string) {
    persistExtraDomains(extraDomains.filter((d) => d !== domain));
    setNotice('Domain removed from your verified list.');
  }

  function handleAutoApproveChange(enabled: boolean) {
    if (!institutionId) return;
    saveAutoApproveInvites(institutionId, enabled);
    setAutoApprove(enabled);
    setNotice(
      enabled
        ? 'New whitelist uploads will automatically queue invitation emails.'
        : 'Invitations will stay pending until you send them from Whitelist.',
    );
  }

  async function handleCreateCampus(e: React.FormEvent) {
    e.preventDefault();
    const name = campusName.trim();
    if (!name) return;
    setSavingCampus(true);
    setError(null);
    try {
      await api.onboarding.createBatch({ name });
      setCampusName('');
      setNotice(`Campus "${name}" created.`);
      const batchList = await api.onboarding.listBatches();
      setBatches(batchList);
    } catch {
      setError('Could not create campus batch.');
    } finally {
      setSavingCampus(false);
    }
  }

  function handleDismissEmployer(employerId: string) {
    if (!institutionId) return;
    dismissEmployerFromQueue(institutionId, employerId);
    setDismissedEmployerIds(loadDismissedEmployerIds(institutionId));
    setNotice('Employer removed from your approval queue.');
  }

  const employerQueue = useMemo(() => {
    return employers.filter(
      (e) =>
        !dismissedEmployerIds.includes(e.employerId) &&
        e.activeOpeningCount === 0 &&
        e.openingCount === 0,
    );
  }, [employers, dismissedEmployerIds]);

  const verificationStatus = entitlements?.verificationStatus ?? 'APPROVED';
  const studentCount = entitlements?.candidateUsage ?? 0;
  const capacity = entitlements?.candidateCapacity;
  const tier = entitlements?.planCode;

  return (
    <div className={bentoPageStackClass}>
      <TpoBentoPageHeader
        title="Settings"
        description="Verified email domains, campus batches, employer access, and plan entitlements."
        icon={Settings}
        accent="amber"
        badge={<span className={bentoChipClass}>University</span>}
      />

      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}
      {notice ? <div className={dashboardSuccessNoticeClass}>{notice}</div> : null}

      <section className={bentoCardClass}>
        <h2 className={dashboardSectionTitleClass}>Verified student email domains</h2>
        <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>
          Only students from these domains can be whitelisted. Subdomains of your primary domain are
          always allowed.
        </p>
        <ul className="mt-4 space-y-2">
          <li
            className={`${bentoCardMutedClass} flex flex-wrap items-center justify-between gap-3`}
          >
            <div className="flex items-center gap-2 font-mono text-[13px] font-semibold">
              <Lock className="size-4 text-[var(--tpo-dash-accent-amber)]" />@{primaryDomain ?? '…'}
            </div>
            <span className={dashboardMintBadgeClass}>Primary · SMART verified</span>
          </li>
          {extraDomains.map((domain) => (
            <li
              key={domain}
              className={`${bentoCardMutedClass} flex flex-wrap items-center justify-between gap-3`}
            >
              <span className="font-mono text-[13px] font-semibold">@{domain}</span>
              <button
                type="button"
                onClick={() => handleRemoveExtra(domain)}
                className={`${secondaryButtonClass} !py-1.5 !text-xs`}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className={labelClass} htmlFor="extra-domain">
              Add another domain
            </label>
            <input
              id="extra-domain"
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="@north.riverdale.edu"
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <button type="button" onClick={handleAddDomain} className={dashboardPrimaryButtonClass}>
            <Plus className="size-4" aria-hidden />
            Add domain
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ds-border-subtle)] pt-5">
          <div>
            <p className="text-sm font-semibold text-[var(--ds-text)]">
              Auto-approve new students from these domains
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--ds-text-muted)]">
              When enabled, bulk whitelist uploads immediately queue invitation emails.
            </p>
          </div>
          <Toggle
            checked={autoApprove}
            onChange={handleAutoApproveChange}
            label="Auto-approve invitations"
          />
        </div>
      </section>

      <section className={bentoCardClass}>
        <h2 className={dashboardSectionTitleClass}>Multi-campus system</h2>
        <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>
          Manage every campus under{' '}
          <strong className="text-[var(--ds-text)]">
            {entitlements?.institutionName ?? 'your institution'}
          </strong>
          . Each campus is a batch with its own student roster.
        </p>
        {loading ? (
          <p className="mt-4 text-[13px] text-[var(--ds-text-muted)]">Loading campuses…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {batches.length === 0 ? (
              <li className={`${bentoCardMutedClass} text-[13px] text-[var(--ds-text-muted)]`}>
                No campuses yet. Create your first batch below.
              </li>
            ) : (
              batches.map((batch) => (
                <li
                  key={batch.batchId}
                  className={`${bentoCardMutedClass} flex flex-wrap items-center justify-between gap-3`}
                >
                  <div>
                    <div className="font-semibold text-[var(--ds-text)]">{batch.name}</div>
                    <div className="text-[12px] text-[var(--ds-text-muted)]">
                      {batch.memberCount.toLocaleString('en-US')} students
                      {batch.pendingInviteCount > 0
                        ? ` · ${batch.pendingInviteCount} pending invites`
                        : ''}
                    </div>
                  </div>
                  <Link href={`/batches/${batch.batchId}`} className={secondaryButtonClass}>
                    Manage
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
        <form
          onSubmit={handleCreateCampus}
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className={labelClass} htmlFor="campus-name">
              Add campus
            </label>
            <input
              id="campus-name"
              value={campusName}
              onChange={(e) => setCampusName(e.target.value)}
              placeholder="Riverdale — North Branch"
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <button
            type="submit"
            disabled={savingCampus || !campusName.trim()}
            className={dashboardPrimaryButtonClass}
          >
            <Plus className="size-4" aria-hidden />
            Add campus
          </button>
        </form>
      </section>

      <section className={bentoCardClass}>
        <h2 className={dashboardSectionTitleClass}>Employer approval queue</h2>
        <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>
          Approve which companies can post jobs to your students. Employers with no drives yet
          appear here until you publish an opening or dismiss the request.
        </p>
        <div className={`${bentoTableShellClass} mt-4`}>
          <table className={`${bentoTableClass} min-w-[640px]`}>
            <thead>
              <tr className={bentoTableHeadRowClass}>
                <th className={bentoTableHeadCellClass}>Employer</th>
                <th className={bentoTableHeadCellClass}>Status</th>
                <th className={`${bentoTableHeadCellClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className={`${bentoTableCellClass} py-8 text-center`}>
                    Loading…
                  </td>
                </tr>
              ) : employerQueue.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`${bentoTableCellClass} py-8 text-center`}>
                    No employers waiting for approval.
                  </td>
                </tr>
              ) : (
                employerQueue.map((employer) => {
                  const verified = Boolean(employer.website?.trim());
                  return (
                    <tr key={employer.employerId} className={bentoTableBodyRowClass}>
                      <td className={bentoTableCellClass}>
                        <div className="font-semibold text-[var(--ds-text)]">{employer.name}</div>
                        <div className="text-[12px] text-[var(--ds-text-muted)]">
                          {employer.sector ?? 'Recruiting partner'}
                        </div>
                      </td>
                      <td className={bentoTableCellClass}>
                        {verified ? (
                          <span className={dashboardMintBadgeClass}>Verified company</span>
                        ) : (
                          <span className={dashboardPendingBadgeClass}>Not yet verified</span>
                        )}
                      </td>
                      <td className={`${bentoTableCellClass} text-right`}>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDismissEmployer(employer.employerId)}
                            className={secondaryButtonClass}
                          >
                            Deny
                          </button>
                          <Link
                            href={`/companies/${employer.employerId}`}
                            className={dashboardPrimaryButtonClass}
                          >
                            Approve
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={dashboardSectionTitleClass}>Institution profile & plan</h2>
        <div className={`${bentoCardClass} space-y-5`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Institution name</label>
              <div
                className={`${bentoCardMutedClass} mt-1.5 flex items-center gap-2 text-[13px] font-semibold`}
              >
                <Building2 className="size-4 text-[var(--tpo-dash-accent-blue)]" />
                {entitlements?.institutionName ?? 'Institution account'}
              </div>
            </div>
            <div>
              <label className={labelClass}>Verification</label>
              <div className={`${bentoCardMutedClass} mt-1.5 text-[13px] font-semibold`}>
                {verificationStatus === 'APPROVED' ? (
                  <span className={dashboardMintBadgeClass}>
                    <CheckCircle2 className="size-3" /> Verified institution
                  </span>
                ) : verificationStatus === 'PENDING' ? (
                  <span className={dashboardPendingBadgeClass}>
                    <Shield className="size-3" /> Pending verification
                  </span>
                ) : (
                  <span className={dashboardErrorNoticeClass}>{verificationStatus}</span>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Whitelisted students</label>
              <div
                className={`${bentoCardMutedClass} mt-1.5 flex items-center gap-2 text-[13px] font-semibold`}
              >
                <Users className="size-4" />
                {studentCount.toLocaleString('en-US')}
              </div>
            </div>
          </div>
          <div
            className={`${bentoCardMutedClass} flex items-start gap-2.5 text-[13px] text-[var(--ds-text-muted)]`}
          >
            <Globe className="mt-0.5 size-4 shrink-0" />
            <span>
              Provisioning is locked to your verified domains. Contact SMART to change your primary
              domain on file.
            </span>
          </div>
        </div>
        <div className={bentoCardClass}>
          {loading ? (
            <p className="text-[13px] text-[var(--ds-text-muted)]">Loading entitlements…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={bentoCardMutedClass}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Plan tier
                </span>
                <div className="mt-2 flex items-center gap-2 text-base font-semibold">
                  <Cpu className="size-4 text-[var(--tpo-dash-accent-lavender)]" />
                  {tier ?? 'INSTITUTION_PRO'}
                </div>
              </div>
              <div className={bentoCardMutedClass}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Candidate capacity
                </span>
                <div className="mt-2 text-base font-semibold">
                  {capacity != null
                    ? `${studentCount} / ${capacity}`
                    : `${studentCount} · unlimited`}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
