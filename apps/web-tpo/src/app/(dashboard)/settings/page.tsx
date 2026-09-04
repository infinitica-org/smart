'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import type { TenantEntitlementsDto } from '@smart/contracts';
import { Alert, Card } from '@smart/ui';
import { ShieldCheck, Users, Bell, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../../lib/api';

function errorMessage(caught: unknown, fallback: string): string {
  if (isSmartApiError(caught) || caught instanceof Error) return caught.message;
  return fallback;
}

const PLAN_NAMES: Record<string, string> = {
  FREE: 'Free Plan',
  BASIC: 'Basic Plan',
  PRO: 'Pro Institution Plan',
};

export default function SettingsPage() {
  const [entitlements, setEntitlements] = useState<TenantEntitlementsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.onboarding
      .tpoEntitlements()
      .then((res) => {
        if (!cancelled) setEntitlements(res);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught, 'Could not load your plan.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="max-w-[1000px] mx-auto space-y-6 font-sans select-none pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#004C63]/10 text-[#004C63] text-xs font-bold mb-2 border border-[#004C63]/20">
            Account Preferences
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
            Institution Settings
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">
            Manage your SMART plan, tier entitlement flags, team access, and notification
            preferences.
          </p>
        </div>
      </div>

      {/* Plan & Verification Status */}
      <section className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-[#004C63]" /> Plan & Verification
        </h3>

        {error ? (
          <Alert tone="danger" title="Plan unavailable">
            {error}
          </Alert>
        ) : loading ? (
          <p role="status" className="text-sm text-slate-500 font-medium p-4">
            Loading your plan…
          </p>
        ) : (
          <Card className="bg-white border border-slate-200/80 shadow-xs p-6 md:p-8 relative overflow-hidden rounded-2xl">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#004C63]" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h4 className="text-xl font-extrabold text-slate-900">
                    {entitlements?.planCode
                      ? (PLAN_NAMES[entitlements.planCode] ?? entitlements.planCode)
                      : 'No plan assigned'}
                  </h4>
                </div>
                {entitlements && entitlements.flags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-w-md">
                    {entitlements.flags.map((flag) => (
                      <span
                        key={flag.key}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          flag.enabled
                            ? 'bg-[#F0FDFA] text-[#004C63] border-[#CCFBF1]'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        {flag.enabled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#004C63]" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {flag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-medium max-w-md">
                    No feature flags configured.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Team Management */}
      <section className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
          <Users className="w-4 h-4 text-slate-400" /> Team Access
        </h3>
        <Card className="bg-white border border-slate-200/80 shadow-xs p-6 text-xs text-slate-500 rounded-2xl leading-relaxed font-medium">
          Inviting additional placement staff from this screen is coming soon. In the meantime,
          reach out to your SMART account team to add team members.
        </Card>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2 px-1">
          <Bell className="w-4 h-4 text-slate-400" /> Notifications
        </h3>
        <Card className="bg-white border border-slate-200/80 shadow-xs p-6 text-xs text-slate-500 rounded-2xl leading-relaxed font-medium">
          Notification preferences aren&apos;t configurable yet — you&apos;ll see this section fill
          in as that feature ships.
        </Card>
      </section>
    </main>
  );
}
