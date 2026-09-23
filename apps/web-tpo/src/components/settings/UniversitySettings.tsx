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
  Briefcase,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import type { BatchDto, PlacementEmployerSummary, TenantEntitlementsDto } from '@smart/contracts';
import { StaffManagementWorkspace } from '../staff/StaffManagementWorkspace';
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

type SettingsTab = 'all' | 'staff' | 'domains' | 'campuses' | 'employers' | 'plan';

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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
        checked ? 'bg-black' : 'bg-zinc-200'
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('all');

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

  const showStaff = activeTab === 'all' || activeTab === 'staff';
  const showDomains = activeTab === 'all' || activeTab === 'domains';
  const showCampuses = activeTab === 'all' || activeTab === 'campuses';
  const showEmployers = activeTab === 'all' || activeTab === 'employers';
  const showPlan = activeTab === 'all' || activeTab === 'plan';

  return (
    <div className={bentoPageStackClass}>
      <TpoBentoPageHeader
        compact
        title="Settings"
        description="Manage verified email domains, campus cohorts, employer approvals, staff access, and plan entitlements."
        icon={Settings}
        accent="amber"
        badge={<span className={bentoChipClass}>Institution Console</span>}
      />

      {/* Overview Snapshot Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${bentoCardClass} !p-4 flex items-center gap-3.5`}>
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 shrink-0">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Institution
            </p>
            <p className="truncate text-sm font-bold text-zinc-900">
              {entitlements?.institutionName ?? 'Institution Account'}
            </p>
          </div>
        </div>

        <div className={`${bentoCardClass} !p-4 flex items-center gap-3.5`}>
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Verification
            </p>
            <p className="truncate text-sm font-bold text-zinc-900">
              {verificationStatus === 'APPROVED'
                ? 'Verified Account'
                : verificationStatus === 'PENDING'
                  ? 'Pending Review'
                  : verificationStatus}
            </p>
          </div>
        </div>

        <div className={`${bentoCardClass} !p-4 flex items-center gap-3.5`}>
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 shrink-0">
            <Users className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Students Enrolled
            </p>
            <p className="truncate text-sm font-bold text-zinc-900">
              {studentCount.toLocaleString('en-US')}
              {capacity ? (
                <span className="text-xs font-normal text-zinc-500"> / {capacity}</span>
              ) : (
                <span className="text-xs font-normal text-zinc-500"> / Unlimited</span>
              )}
            </p>
          </div>
        </div>

        <div className={`${bentoCardClass} !p-4 flex items-center gap-3.5`}>
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 shrink-0">
            <Cpu className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Plan Code
            </p>
            <p className="truncate text-sm font-bold text-zinc-900">{tier ?? 'INSTITUTION_PRO'}</p>
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3 pt-1">
        <div className="flex flex-wrap gap-1 rounded-md border border-zinc-200/80 bg-zinc-100 p-1">
          {[
            { id: 'all', label: 'All Settings' },
            { id: 'staff', label: 'Staff & Access' },
            { id: 'domains', label: 'Verified Domains' },
            { id: 'campuses', label: `Campuses (${batches.length})` },
            { id: 'employers', label: `Employer Queue (${employerQueue.length})` },
            { id: 'plan', label: 'Plan & Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-black text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}
      {notice ? <div className={dashboardSuccessNoticeClass}>{notice}</div> : null}

      {/* Section: Staff Management */}
      {showStaff ? (
        <section id="settings-staff" className="space-y-3">
          <StaffManagementWorkspace />
        </section>
      ) : null}

      {/* Section: Email Domains */}
      {showDomains ? (
        <section id="settings-domains" className={bentoCardClass}>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-zinc-700" />
            <h2 className={dashboardSectionTitleClass}>Verified student email domains</h2>
          </div>
          <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>
            Only students with email addresses from these verified domains can be whitelisted and
            provisioned into your institution cohorts.
          </p>

          <div className="mt-5 space-y-3">
            <div
              className={`${bentoCardMutedClass} flex flex-wrap items-center justify-between gap-3 !p-3.5`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-900">
                  <Lock className="size-3.5" />
                </div>
                <div>
                  <span className="font-mono text-sm font-semibold text-zinc-900">
                    @{primaryDomain ?? '…'}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">Primary domain</span>
                </div>
              </div>
              <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-900">
                SMART Verified
              </span>
            </div>

            {extraDomains.map((domain) => (
              <div
                key={domain}
                className={`${bentoCardMutedClass} flex flex-wrap items-center justify-between gap-3 !p-3.5`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-900">
                    <Globe className="size-3.5" />
                  </div>
                  <span className="font-mono text-sm font-semibold text-zinc-900">@{domain}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExtra(domain)}
                  className={`${secondaryButtonClass} !py-1.5 !text-xs text-zinc-900 hover:bg-zinc-100`}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className={labelClass} htmlFor="extra-domain">
                Add another verified domain
              </label>
              <input
                id="extra-domain"
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g. north.riverdale.edu"
                className={`${inputClass} mt-1.5`}
              />
            </div>
            <button type="button" onClick={handleAddDomain} className={dashboardPrimaryButtonClass}>
              <Plus className="size-4" aria-hidden />
              Add domain
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200/80 pt-5">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Auto-approve new students from these domains
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                When enabled, bulk whitelist uploads will immediately queue invitation emails
                without requiring manual individual dispatch.
              </p>
            </div>
            <Toggle
              checked={autoApprove}
              onChange={handleAutoApproveChange}
              label="Auto-approve invitations"
            />
          </div>
        </section>
      ) : null}

      {/* Section: Multi-Campus System */}
      {showCampuses ? (
        <section id="settings-campuses" className={bentoCardClass}>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-zinc-700" />
            <h2 className={dashboardSectionTitleClass}>Multi-campus system</h2>
          </div>
          <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>
            Manage cohorts and campus divisions under{' '}
            <strong className="text-zinc-900">
              {entitlements?.institutionName ?? 'your institution'}
            </strong>
            . Each campus maintains an isolated candidate roster and placement records.
          </p>

          {loading ? (
            <p className="mt-4 text-xs text-zinc-400">Loading campuses…</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {batches.length === 0 ? (
                <div
                  className={`${bentoCardMutedClass} col-span-full py-6 text-center text-xs text-zinc-500`}
                >
                  No campuses configured yet. Add your first campus batch below.
                </div>
              ) : (
                batches.map((batch) => (
                  <div
                    key={batch.batchId}
                    className={`${bentoCardMutedClass} flex items-center justify-between gap-3 !p-4`}
                  >
                    <div>
                      <div className="font-bold text-zinc-900 text-sm">{batch.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {batch.memberCount.toLocaleString('en-US')} students enrolled
                        {batch.pendingInviteCount > 0
                          ? ` · ${batch.pendingInviteCount} pending invites`
                          : ''}
                      </div>
                    </div>
                    <Link
                      href={`/batches/${batch.batchId}`}
                      className={`${secondaryButtonClass} !py-1.5 !px-3 text-xs inline-flex items-center gap-1`}
                    >
                      Manage
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          <form
            onSubmit={handleCreateCampus}
            className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end border-t border-zinc-200/80 pt-5"
          >
            <div className="flex-1">
              <label className={labelClass} htmlFor="campus-name">
                Add new campus or cohort batch
              </label>
              <input
                id="campus-name"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                placeholder="e.g. Riverdale — North Campus"
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
      ) : null}

      {/* Section: Employer Approval Queue */}
      {showEmployers ? (
        <section id="settings-employers" className={bentoCardClass}>
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-zinc-700" />
            <h2 className={dashboardSectionTitleClass}>Employer approval queue</h2>
          </div>
          <p className={`mt-1 ${dashboardSectionSubtitleClass}`}>
            Review and approve hiring partners requesting access to post job openings and source
            candidates from your institution.
          </p>

          <div className={`${bentoTableShellClass} mt-5`}>
            <table className={`${bentoTableClass} min-w-[640px]`}>
              <thead>
                <tr className={bentoTableHeadRowClass}>
                  <th className={bentoTableHeadCellClass}>Employer Name</th>
                  <th className={bentoTableHeadCellClass}>Status</th>
                  <th className={`${bentoTableHeadCellClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className={`${bentoTableCellClass} py-8 text-center text-xs text-zinc-400`}
                    >
                      Loading queue…
                    </td>
                  </tr>
                ) : employerQueue.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className={`${bentoTableCellClass} py-8 text-center text-xs text-zinc-500`}
                    >
                      No pending employers waiting for approval.
                    </td>
                  </tr>
                ) : (
                  employerQueue.map((employer) => {
                    const verified = Boolean(employer.website?.trim());
                    return (
                      <tr key={employer.employerId} className={bentoTableBodyRowClass}>
                        <td className={bentoTableCellClass}>
                          <div className="font-semibold text-zinc-900">{employer.name}</div>
                          <div className="text-xs text-zinc-500">
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
      ) : null}

      {/* Section: Plan & Institution Profile */}
      {showPlan ? (
        <section id="settings-plan" className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-zinc-700" />
            <h2 className={dashboardSectionTitleClass}>Institution profile & plan</h2>
          </div>

          <div className={`${bentoCardClass} space-y-4`}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Institution Name</label>
                <div
                  className={`${bentoCardMutedClass} mt-1.5 flex items-center gap-2 font-semibold text-zinc-900`}
                >
                  <Building2 className="size-4 text-zinc-700 shrink-0" />
                  <span className="truncate">
                    {entitlements?.institutionName ?? 'Institution account'}
                  </span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Verification Status</label>
                <div className={`${bentoCardMutedClass} mt-1.5 font-semibold`}>
                  {verificationStatus === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-900">
                      <CheckCircle2 className="size-3.5" /> Verified Institution
                    </span>
                  ) : verificationStatus === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                      <Shield className="size-3.5" /> Pending Verification
                    </span>
                  ) : (
                    <span className={dashboardErrorNoticeClass}>{verificationStatus}</span>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Whitelisted Students</label>
                <div
                  className={`${bentoCardMutedClass} mt-1.5 flex items-center gap-2 font-semibold text-zinc-900`}
                >
                  <Users className="size-4 text-zinc-700 shrink-0" />
                  {studentCount.toLocaleString('en-US')}
                </div>
              </div>
            </div>

            <div
              className={`${bentoCardMutedClass} flex items-start gap-2.5 text-xs text-zinc-500 !p-3.5`}
            >
              <Globe className="mt-0.5 size-4 shrink-0 text-zinc-400" />
              <span>
                Provisioning is locked to your verified domains. Contact SMART Enterprise Support to
                change your primary institutional domain on file.
              </span>
            </div>
          </div>

          <div className={bentoCardClass}>
            {loading ? (
              <p className="text-xs text-zinc-400">Loading entitlements…</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={bentoCardMutedClass}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Plan Tier
                  </span>
                  <div className="mt-1.5 flex items-center gap-2 text-base font-bold text-zinc-900">
                    <Cpu className="size-4 text-zinc-700" />
                    {tier ?? 'INSTITUTION_PRO'}
                  </div>
                </div>
                <div className={bentoCardMutedClass}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Candidate Capacity
                  </span>
                  <div className="mt-1.5 text-base font-bold text-zinc-900">
                    {capacity != null
                      ? `${studentCount.toLocaleString()} / ${capacity.toLocaleString()} seats`
                      : `${studentCount.toLocaleString()} seats · Unlimited`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
