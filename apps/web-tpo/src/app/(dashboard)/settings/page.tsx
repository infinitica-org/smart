'use client';

import { Card, Button } from '@smart/ui';
import { ShieldCheck, Users, Bell, Mail, Smartphone, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
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
        <Card className="bg-[#131313] border-emerald-500/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-xl font-bold text-white">Pro Institution Plan</h4>
                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Account
                </span>
              </div>
              <p className="text-sm text-gray-400 max-w-md">
                Your institution is fully verified. You have access to unlimited bulk provisioning,
                custom API integrations, and premium AI matching.
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <div className="text-sm text-gray-400">
                Next billing date: <strong className="text-white">Oct 1, 2026</strong>
              </div>
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                Manage Billing
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Team Management */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" /> Team Access
          </h3>
          <Button
            variant="primary"
            className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white text-sm h-8"
          >
            Invite Member
          </Button>
        </div>

        <Card className="bg-[#131313] border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#161616] border-b border-white/5 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">Dr. Satheswaran</div>
                    <div className="text-xs text-gray-500">satheswaran@institution.edu</div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">Admin</td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-400 text-xs font-medium">Active</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 text-xs">(You)</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">Jane Doe</div>
                    <div className="text-xs text-gray-500">jane.doe@institution.edu</div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">Placement Coordinator</td>
                  <td className="px-6 py-4">
                    <span className="text-amber-400 text-xs font-medium">Invite Pending</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs text-gray-400 hover:text-white underline">
                      Resend
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Notifications */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-400" /> Notifications
        </h3>

        <Card className="bg-[#131313] border-white/5 p-0 divide-y divide-white/5">
          <div className="p-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-medium mb-1">New Job Descriptions</div>
              <div className="text-sm text-gray-400">
                Receive an alert when a company sends a new JD.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" defaultChecked className="accent-[#00fad0]" />{' '}
                <Mail className="w-4 h-4" /> Email
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" className="accent-[#00fad0]" />{' '}
                <Smartphone className="w-4 h-4" /> Push
              </label>
            </div>
          </div>

          <div className="p-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-medium mb-1">Candidate Opt-ins</div>
              <div className="text-sm text-gray-400">
                Alerts when a student accepts a shortlist invitation.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" className="accent-[#00fad0]" /> <Mail className="w-4 h-4" />{' '}
                Email
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" defaultChecked className="accent-[#00fad0]" />{' '}
                <Smartphone className="w-4 h-4" /> Push
              </label>
            </div>
          </div>

          <div className="p-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-medium mb-1">Batch Readiness Alerts</div>
              <div className="text-sm text-gray-400">
                Weekly digest of your cohort's skill verification progress.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" defaultChecked className="accent-[#00fad0]" />{' '}
                <Mail className="w-4 h-4" /> Email
              </label>
            </div>
          </div>
        </Card>
      </section>

      <div className="pt-4 flex justify-end">
        <Button variant="primary" className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white">
          Save Preferences
        </Button>
      </div>
    </main>
  );
}
