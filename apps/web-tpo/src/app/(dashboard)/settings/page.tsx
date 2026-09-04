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
    <main className="max-w-[1000px] mx-auto space-y-6 font-sans select-none">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-1">
            Institution Settings
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            Manage your SMART plan, tier entitlement flags, team access, and notification
            preferences.
          </p>
        </div>
      </div>

      {/* Plan & Verification Status */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Plan & Verification
        </h3>

        {error ? (
          <Alert tone="danger" title="Plan unavailable">
            {error}
          </Alert>
        ) : loading ? (
          <p role="status" className="text-sm text-slate-500 font-medium">
            Loading your plan…
          </p>
        ) : (
          <Card className="bg-white border border-slate-200/80 shadow-sm p-6 relative overflow-hidden rounded-2xl">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-xl font-bold text-slate-900">
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          flag.enabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {flag.enabled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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

      {/* Team Management — not built yet */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" /> Team Access
        </h3>
        <Card className="bg-white border border-slate-200/80 shadow-sm p-6 text-xs text-slate-500 rounded-2xl leading-relaxed font-medium">
          Inviting additional placement staff from this screen is coming soon. In the meantime,
          reach out to your SMART account team to add team members.
        </Card>
      </section>

      {/* Notifications — not built yet */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-400" /> Notifications
        </h3>
        <Card className="bg-white border border-slate-200/80 shadow-sm p-6 text-xs text-slate-500 rounded-2xl leading-relaxed font-medium">
          Notification preferences aren&apos;t configurable yet — you&apos;ll see this section fill
          in as that feature ships.
        </Card>
      </section>
    </main>
  );
}
