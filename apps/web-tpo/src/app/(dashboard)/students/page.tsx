'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@smart/ui';
import type { InstitutionStudentDto, StudentInviteFilter } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { api } from '../../../lib/api';
import {
  Search,
  Upload,
  Filter,
  ShieldCheck,
  Clock,
  Ban,
  AlertTriangle,
  CheckCircle,
  Users,
} from 'lucide-react';
import { CandidateProvisioningModal } from '../../../components/candidate-provisioning-modal';
import { CandidateDetailDrawer } from '../../../components/candidate-detail-drawer';

export default function TpoStudentsPage() {
  const [students, setStudents] = useState<InstitutionStudentDto[]>([]);
  const [q, setQ] = useState('');
  const [inviteStatus, setInviteStatus] = useState<StudentInviteFilter | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  // Modals
  const [isProvisioningOpen, setIsProvisioningOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  async function load() {
    setStudents(
      await api.onboarding.listTpoStudents({
        q: q.trim() || undefined,
        inviteStatus: inviteStatus || undefined,
      }),
    );
  }

  useEffect(() => {
    load().catch((err) =>
      setError(isSmartApiError(err) ? err.message : 'Failed to load students.'),
    );
  }, []);

  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Candidates</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage your student roster, provisioning, and readiness tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white flex items-center gap-2 shadow-[0_0_15px_rgba(224,89,41,0.2)]"
            onClick={() => setIsProvisioningOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Provision Students
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Filters Toolbar */}
      <Card className="bg-[#131313] border-white/5 p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search candidates by name or email..."
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select
            className="bg-[#1a1a1a] text-gray-300 text-sm rounded-lg border border-white/5 px-4 focus:outline-none focus:border-[#00fad0]/50"
            value={inviteStatus}
            onChange={(e) => setInviteStatus(e.target.value as StudentInviteFilter | '')}
          >
            <option value="">All Invite Statuses</option>
            <option value="PENDING">Invite Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="NONE">No Invite</option>
          </select>
          <Button
            type="button"
            variant="secondary"
            className="bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
            onClick={() => {
              setError(null);
              setMessage(null);
              load().catch((err) =>
                setError(isSmartApiError(err) ? err.message : 'Failed to load students.'),
              );
            }}
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="bg-[#131313] border-white/5 overflow-hidden">
        {students.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white">No candidates found</h3>
            <p className="text-gray-400 text-sm mt-1 mb-6 max-w-sm">
              We couldn't find any candidates matching your current filters. Try adjusting your
              search criteria or provision new students.
            </p>
            <Button
              variant="outline"
              className="border-white/10 text-white"
              onClick={() => {
                setQ('');
                setInviteStatus('');
                load();
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#161616] border-b border-white/5 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Candidate</th>
                  <th className="px-6 py-4 font-medium">Batch</th>
                  <th className="px-6 py-4 font-medium">Invite Status</th>
                  <th className="px-6 py-4 font-medium">Verification</th>
                  <th className="px-6 py-4 font-medium">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student) => (
                  <tr
                    key={student.userId}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelectedCandidateId(student.userId)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-medium text-xs shadow-inner">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-white">{student.fullName}</div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs">
                        {student.batchName ?? 'No Batch'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {student.inviteStatus === 'ACCEPTED' && (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Accepted
                          </span>
                        )}
                        {student.inviteStatus === 'PENDING' && (
                          <span className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {!student.inviteStatus && (
                          <span className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Not Invited
                          </span>
                        )}
                        {student.inviteStatus === 'PENDING' && (
                          <button
                            type="button"
                            title="Copy this student's invite link to share offline"
                            aria-label={`Copy invite link for ${student.fullName}`}
                            className="text-xs underline text-gray-400 hover:text-white disabled:opacity-50"
                            disabled={copyingId === student.userId}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setCopyingId(student.userId);
                              try {
                                const { inviteUrl } = await api.onboarding.getStudentInviteLink(
                                  student.userId,
                                );
                                await navigator.clipboard.writeText(inviteUrl);
                                setMessage(`Invite link copied for ${student.fullName}.`);
                              } catch (err) {
                                setError(
                                  isSmartApiError(err)
                                    ? err.message
                                    : 'Could not copy invite link.',
                                );
                              } finally {
                                setCopyingId(null);
                              }
                            }}
                          >
                            {copyingId === student.userId ? 'Copying…' : 'Copy link'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* Placeholder for standard Verification Badge */}
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-xs text-gray-300">In Progress</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.heldAt ? (
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                            <Ban className="w-3.5 h-3.5" /> On Hold
                          </span>
                          <button
                            className="text-xs underline text-gray-400 hover:text-white"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await api.onboarding.releaseTpoStudentHold(student.userId, {
                                  reason: 'Released manually',
                                });
                                setMessage('Student hold released.');
                                load();
                              } catch (err) {
                                setError(
                                  isSmartApiError(err) ? err.message : 'Could not update hold.',
                                );
                              }
                            }}
                          >
                            Release
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" /> Active
                          </span>
                          <button
                            className="text-xs underline text-gray-400 hover:text-white"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await api.onboarding.holdTpoStudent(student.userId, {
                                  reason: 'Held from TPO Dashboard',
                                });
                                setMessage('Student session is on hold.');
                                load();
                              } catch (err) {
                                setError(
                                  isSmartApiError(err) ? err.message : 'Could not update hold.',
                                );
                              }
                            }}
                          >
                            Hold
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CandidateProvisioningModal
        isOpen={isProvisioningOpen}
        onClose={() => setIsProvisioningOpen(false)}
      />

      <CandidateDetailDrawer
        candidate={students.find((s) => s.userId === selectedCandidateId) ?? null}
        isOpen={!!selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </main>
  );
}
