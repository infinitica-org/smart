'use client';

import { useEffect, useState } from 'react';
import { Check, Link2, Plus, Users } from 'lucide-react';
import { Badge, PageHeader, Modal } from '../../../components/ui';
import { getCurrentUser } from '../../../lib/auth';
import type { Teammate } from '../../../lib/types';
import {
  input,
  label,
  pageStack,
  primaryButton,
  secondaryButton,
  table,
  tableCell,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableShell,
} from '../../../lib/ui';

export default function TeammatesPage() {
  const [copied, setCopied] = useState(false);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Recruiter');

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user && user.email) {
          const rawName = user.email.split('@')[0] || 'Team Member';
          setTeammates([
            {
              name: rawName,
              email: user.email,
              role:
                user.role === 'SUPER_ADMIN' || user.role === 'INSTITUTION_ADMIN'
                  ? 'Company Admin'
                  : 'Recruiter',
              status: 'Registered',
            },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/login`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard fallback
    }
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const name = inviteEmail.split('@')[0] || 'Colleague';
    setTeammates((prev) => [
      ...prev,
      {
        name,
        email: inviteEmail.trim(),
        role: inviteRole,
        status: 'Invited',
      },
    ]);
    setInviteEmail('');
    setInviteModalOpen(false);
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title="Teammates"
        description="Manage your hiring team members who can post jobs and review student candidates."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className={primaryButton}
            >
              <Plus className="size-4" aria-hidden />
              Invite teammate
            </button>
            <button type="button" onClick={() => void copyInvite()} className={secondaryButton}>
              {copied ? (
                <Check className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-[20px] border border-[var(--ds-border)] bg-white">
          <p className="text-sm text-[var(--ds-text-muted)]">Loading team members...</p>
        </div>
      ) : teammates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-[var(--ds-border)] bg-white p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 mb-4">
            <Users className="size-6" />
          </div>
          <h2 className="text-base font-semibold text-[var(--ds-text)]">No teammates yet</h2>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--ds-text-muted)]">
            Invite recruiters and hiring managers to collaborate on job postings and candidate
            reviews.
          </p>
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className={`mt-4 ${primaryButton}`}
          >
            <Plus className="size-4" />
            Invite your first teammate
          </button>
        </div>
      ) : (
        <div className={tableShell}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Role</th>
                <th className={tableHeadCell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {teammates.map((t) => (
                <tr key={t.email} className={tableRow}>
                  <td className={tableCell}>
                    <p className="font-semibold capitalize text-[var(--ds-text)]">{t.name}</p>
                    <p className="text-[12px] text-[var(--ds-text-muted)]">{t.email}</p>
                  </td>
                  <td className={tableCell}>{t.role}</td>
                  <td className={tableCell}>
                    <Badge tone={t.status === 'Registered' ? 'green' : 'amber'}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={inviteModalOpen}
        title="Invite team member"
        onClose={() => setInviteModalOpen(false)}
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className={label}>Work Email</label>
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={input}
            >
              <option value="Recruiter">Recruiter</option>
              <option value="Hiring Manager">Hiring Manager</option>
              <option value="Company Admin">Company Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className={secondaryButton}
            >
              Cancel
            </button>
            <button type="submit" className={primaryButton}>
              Send invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
