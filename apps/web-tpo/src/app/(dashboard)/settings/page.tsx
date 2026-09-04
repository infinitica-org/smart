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
    <main className="max-w-[1000px] mx-auto p-4 md:p-8 space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Institution Settings</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage your SMART plan, team access, and notification preferences.
          </p>
        </div>
      </div>

      {/* Plan & Verification Status */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Plan & Verification
        </h3>

        {error ? (
          <Alert tone="danger" title="Plan unavailable">
            {error}
          </Alert>
        ) : loading ? (
          <p role="status" className="text-sm text-gray-400">
            Loading your plan…
          </p>
        ) : (
          <Card className="bg-[#131313] border-emerald-500/20 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xl font-bold text-white">
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
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${
                          flag.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-white/5 text-gray-500 border-white/10'
                        }`}
                      >
                        {flag.enabled ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {flag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 max-w-md">No feature flags configured.</p>
                )}
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Team Management — not built yet */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" /> Team Access
        </h3>
        <Card className="bg-[#131313] border-white/5 p-6 text-sm text-gray-400">
          Inviting additional placement staff from this screen is coming soon. In the meantime,
          reach out to your SMART account team to add team members.
        </Card>
      </section>

      {/* Notifications — not built yet */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-400" /> Notifications
        </h3>
        <Card className="bg-[#131313] border-white/5 p-6 text-sm text-gray-400">
          Notification preferences aren&apos;t configurable yet — you&apos;ll see this section fill
          in as that feature ships.
        </Card>
      </section>
    </main>
  );
}
