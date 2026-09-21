'use client';

import { useEffect, useState } from 'react';
import { Building2, Globe, Shield, Lock, CheckCircle2, Cpu } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { TpoBentoPageHeader } from '../../../components/tpo-bento/TpoBentoPageHeader';
import { api } from '../../../lib/api';
import {
  bentoCardClass,
  bentoCardMutedClass,
  bentoChipClass,
  bentoPageStackClass,
  dashboardErrorNoticeClass,
  dashboardMintBadgeClass,
  dashboardPendingBadgeClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
} from '../../../lib/tpo-dashboard-ui';
import { labelClass } from '../../../lib/tpo-ui';

export default function SettingsPage() {
  const [domain, setDomain] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<number | null | undefined>(undefined);
  const [tier, setTier] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.onboarding
      .tpoEntitlements()
      .then((entitlements) => {
        if (!active) return;
        setDomain(entitlements.domain ?? null);
        setInstitutionName(entitlements.institutionName ?? null);
        setVerificationStatus(entitlements.verificationStatus ?? 'APPROVED');
        setCapacity(entitlements.candidateCapacity);
        setTier(entitlements.planCode);
        setStudentCount(entitlements.candidateUsage ?? 0);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(isSmartApiError(err) ? err.message : 'Failed to load institutional entitlements.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={bentoPageStackClass}>
      <TpoBentoPageHeader
        title="Institution Profile & Entitlements"
        description="Read-only institutional identity, locked email domain rules, and plan entitlements."
        icon={Building2}
        accent="amber"
        badge={<span className={bentoChipClass}>Institution Settings</span>}
      />

      {error ? <div className={dashboardErrorNoticeClass}>{error}</div> : null}

      <section className="space-y-3">
        <h2 className={dashboardSectionTitleClass}>Institutional Profile (Read-Only)</h2>
        <p className={dashboardSectionSubtitleClass}>
          Identity and domain enforcement for your cohort.
        </p>
        <div className={`${bentoCardClass} space-y-5`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Institution Name</label>
              <div
                className={`${bentoCardMutedClass} mt-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--ds-text)]`}
              >
                <Building2 className="size-4 text-[var(--tpo-dash-accent-blue)]" />
                {institutionName ?? 'Institution Account'}
              </div>
            </div>
            <div>
              <label className={labelClass}>Locked Email Domain(s)</label>
              <div
                className={`${bentoCardMutedClass} mt-1.5 flex items-center gap-2 font-mono text-[13px] font-semibold text-[var(--ds-text)]`}
              >
                <Lock className="size-4 text-[var(--tpo-dash-accent-amber)]" />
                {domain ? `@${domain}` : 'Domain Unset'}
              </div>
            </div>
            <div>
              <label className={labelClass}>Verification Status</label>
              <div className={`${bentoCardMutedClass} mt-1.5 text-[13px] font-semibold`}>
                {verificationStatus === 'APPROVED' || verificationStatus === 'VERIFIED' ? (
                  <span className={dashboardMintBadgeClass}>
                    <CheckCircle2 className="size-3" /> Verified Institution
                  </span>
                ) : verificationStatus === 'PENDING' ? (
                  <span className={dashboardPendingBadgeClass}>
                    <Shield className="size-3" /> Pending Verification
                  </span>
                ) : (
                  <span className={dashboardErrorNoticeClass}>
                    <Shield className="size-3" /> {verificationStatus ?? 'Unverified'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div
            className={`${bentoCardMutedClass} flex items-start gap-2.5 text-[13px] text-[var(--ds-text-muted)]`}
          >
            <Globe className="mt-0.5 size-4 shrink-0 text-[var(--ds-text-subtle)]" />
            <span>
              <strong className="text-[var(--ds-text)]">Domain Enforcement:</strong> Candidate
              provisioning and invitations are strictly locked to candidate emails ending with{' '}
              {domain ? `@${domain}` : 'the institutional domain'}.
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={dashboardSectionTitleClass}>Plan & Entitlements</h2>
        <div className={bentoCardClass}>
          {loading ? (
            <p className="text-[13px] text-[var(--ds-text-muted)]">Loading entitlements…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className={bentoCardMutedClass}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Active Subscription Tier
                </span>
                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-[var(--ds-text)]">
                  <Cpu className="size-4 text-[var(--tpo-dash-accent-lavender)]" />
                  {tier ?? 'INSTITUTION_PRO'}
                </div>
              </div>
              <div className={bentoCardMutedClass}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Candidate Entitlement Capacity
                </span>
                <div className="mt-2 text-base font-semibold text-[var(--ds-text)]">
                  {capacity !== undefined && capacity !== null
                    ? `${studentCount} / ${capacity} Candidate${studentCount === 1 ? '' : 's'}`
                    : `${studentCount} Candidate${studentCount === 1 ? '' : 's'} · Unlimited`}
                </div>
                {capacity !== undefined && capacity !== null ? (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ds-surface)]">
                    <div
                      className={`h-full rounded-full ${studentCount >= capacity ? 'bg-[var(--tpo-dash-accent-rose)]' : 'bg-[var(--tpo-dash-accent-mint)]'}`}
                      style={{ width: `${Math.min(100, (studentCount / capacity) * 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>
              <div className={bentoCardMutedClass}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  Currently Provisioned
                </span>
                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-[#047857]">
                  <CheckCircle2 className="size-4" /> {studentCount} Active
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
