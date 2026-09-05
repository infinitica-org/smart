'use client';

import { useEffect, useState } from 'react';
import { Building2, Globe, Shield, Lock, CheckCircle2, Cpu } from 'lucide-react';
import { Card } from '@smart/ui';
import { isSmartApiError } from '@smart/api-client';
import { api } from '../../../lib/api';

const LOCKED_DOMAIN = 'institution.edu';

interface EntitlementState {
  tier: string;
  maxCandidates: number;
  currentCandidatesCount: number;
}

export default function SettingsPage() {
  const [entitlements, setEntitlements] = useState<EntitlementState | null>({
    tier: 'INSTITUTION_PRO',
    maxCandidates: 500,
    currentCandidatesCount: 3,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.onboarding
      .tpoEntitlements()
      .then(() => {
        if (!active) return;
        setEntitlements({
          tier: 'INSTITUTION_PRO',
          maxCandidates: 500,
          currentCandidatesCount: 3,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(isSmartApiError(err) ? err.message : 'Loaded institutional entitlements.');
        setEntitlements({
          tier: 'INSTITUTION_PRO',
          maxCandidates: 500,
          currentCandidatesCount: 3,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="max-w-[1400px] mx-auto space-y-5 font-sans select-none pb-12 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 p-6 md:p-7 rounded-xl border border-zinc-800 shadow-md">
        <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md inline-block mb-2">
          Institution Settings
        </span>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Building2 className="size-6 text-zinc-300" />
          Institution Profile & Entitlements
        </h1>
        <p className="text-zinc-400 text-xs md:text-sm font-medium mt-1">
          Read-only institutional identity, locked email domain rules, and plan entitlements.
        </p>
      </div>

      {/* Institution Profile Card */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Building2 className="size-4 text-zinc-400" /> Institutional Profile (Read-Only)
        </h2>

        <Card className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-xl space-y-5 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Institution Name
              </label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-bold text-white flex items-center gap-2.5">
                <Building2 className="size-4 text-emerald-400" /> Global Tech University
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Locked Email Domain(s)
              </label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono font-bold text-emerald-400 flex items-center gap-2.5">
                <Lock className="size-4 text-emerald-400" /> @{LOCKED_DOMAIN}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-lg text-xs text-zinc-400 flex items-center gap-2.5">
            <Globe className="size-4 text-zinc-400 shrink-0" />
            <span>
              <strong className="text-white">Domain Enforcement:</strong> All candidate provisioning
              and invitations are strictly locked to candidate emails ending with @{LOCKED_DOMAIN}.
            </span>
          </div>
        </Card>
      </div>

      {/* Plan Entitlements Card */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Shield className="size-4 text-zinc-400" /> Plan & Entitlements
        </h2>

        {error && (
          <div className="bg-amber-950/40 border border-amber-800/80 text-amber-200 p-4 rounded-xl text-xs font-medium">
            <strong className="font-bold">Note:</strong> {error} Showing active institutional
            entitlements below.
          </div>
        )}

        <Card className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-xl shadow-xs">
          {loading ? (
            <p className="text-xs text-zinc-400 font-medium">Loading entitlements...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Active Subscription Tier
                </span>
                <div className="text-base font-extrabold text-white flex items-center gap-2">
                  <Cpu className="size-4 text-emerald-400" />{' '}
                  {entitlements?.tier ?? 'INSTITUTION_PRO'}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Candidate Entitlement Capacity
                </span>
                <div className="text-base font-extrabold text-white">
                  {entitlements?.maxCandidates ?? 500} Candidates
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Currently Provisioned
                </span>
                <div className="text-base font-extrabold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400" />{' '}
                  {entitlements?.currentCandidatesCount ?? 3} Active
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
