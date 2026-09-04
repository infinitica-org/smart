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
  AlertTriangle,
  CheckCircle,
  Users,
  X,
  Copy,
  UserX,
  UserCheck,
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
    <main className="max-w-[1400px] mx-auto space-y-6 font-sans select-none pb-12">
      {/* Header & Actions */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              Candidate Roster
            </h1>
            <span className="bg-[#F0FDFA] text-[#004C63] border border-[#CCFBF1] text-xs font-bold px-3 py-1 rounded-full">
              {students.length} Total Candidates
            </span>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-medium">
            Manage your student roster, candidate invitations, and skill readiness verification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            className="bg-[#004C63] hover:bg-[#0A4D5C] text-white flex items-center gap-2 font-bold shadow-xs px-5 py-3 rounded-xl text-xs transition-all"
            onClick={() => setIsProvisioningOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Provision Students
          </Button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-700 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200/90 text-emerald-900 p-4 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold">{message}</p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <Card className="bg-white border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row gap-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates by name or email..."
            className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl py-2.5 pl-10 pr-4 border border-slate-200/90 focus:outline-none focus:border-[#004C63] focus:bg-white focus:ring-2 focus:ring-[#004C63]/15 transition-all placeholder:text-slate-400 font-medium shadow-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <select
            className="bg-slate-50 text-slate-700 text-xs rounded-xl border border-slate-200/90 px-4 py-2.5 focus:outline-none focus:border-[#004C63] focus:bg-white font-semibold cursor-pointer shadow-xs transition-all"
            value={inviteStatus}
            onChange={(e) => setInviteStatus(e.target.value as StudentInviteFilter | '')}
          >
            <option value="">All Invite Statuses</option>
            <option value="PENDING">Invite Sent (Pending)</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="NONE">No Invite</option>
          </select>
          <Button
            type="button"
            className="bg-[#004C63] hover:bg-[#0A4D5C] text-white flex items-center gap-2 font-bold text-xs rounded-xl px-5 py-2.5 shadow-xs transition-all"
            onClick={() => {
              setError(null);
              setMessage(null);
              load().catch((err) =>
                setError(isSmartApiError(err) ? err.message : 'Failed to load students.'),
              );
            }}
          >
            <Filter className="w-3.5 h-3.5 text-white" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="bg-white border border-slate-200/80 shadow-xs overflow-hidden rounded-2xl">
        {students.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#F0FDFA] rounded-full flex items-center justify-center mb-4 border border-[#CCFBF1]">
              <Users className="w-8 h-8 text-[#004C63]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No candidates found</h3>
            <p className="text-slate-500 text-xs mt-1 mb-6 max-w-sm font-medium">
              We couldn't find any candidates matching your current filters. Try adjusting your
              search criteria or provision new students.
            </p>
            <Button
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
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
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">Invite Status</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr
                    key={student.userId}
                    className="hover:bg-[#F0FDFA]/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedCandidateId(student.userId)}
                  >
                    {/* Candidate Info with Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#004C63] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{student.fullName}</div>
                          <div className="text-xs text-slate-500 font-medium">{student.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="px-6 py-4 text-slate-600">
                      <span className="bg-slate-100 border border-slate-200/90 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                        {student.batchName ?? 'No Batch'}
                      </span>
                    </td>

                    {/* Invite Status */}
                    <td className="px-6 py-4">
                      {student.inviteStatus === 'ACCEPTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Accepted
                        </span>
                      )}
                      {student.inviteStatus === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Invite Sent
                        </span>
                      )}
                      {!student.inviteStatus && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span> Not Invited
                        </span>
                      )}
                    </td>

                    {/* Verification */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> In Progress
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="px-6 py-4">
                      {student.heldAt ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> On Hold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {student.inviteStatus === 'PENDING' && (
                          <button
                            type="button"
                            title="Copy student invite link"
                            aria-label={`Copy invite link for ${student.fullName}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                            disabled={copyingId === student.userId}
                            onClick={async () => {
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
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            {copyingId === student.userId ? 'Copying…' : 'Copy Link'}
                          </button>
                        )}
                        {student.heldAt ? (
                          <button
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/90 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                            onClick={async () => {
                              try {
                                await api.onboarding.releaseTpoStudentHold(student.userId, {
                                  reason: 'Released manually',
                                });
                                setMessage(`Hold released for ${student.fullName}.`);
                                load();
                              } catch (err) {
                                setError(
                                  isSmartApiError(err) ? err.message : 'Could not update hold.',
                                );
                              }
                            }}
                          >
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Release Hold
                          </button>
                        ) : (
                          <button
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                            onClick={async () => {
                              try {
                                await api.onboarding.holdTpoStudent(student.userId, {
                                  reason: 'Held from TPO Dashboard',
                                });
                                setMessage(`Hold placed on ${student.fullName}.`);
                                load();
                              } catch (err) {
                                setError(
                                  isSmartApiError(err) ? err.message : 'Could not update hold.',
                                );
                              }
                            }}
                          >
                            <UserX className="w-3.5 h-3.5 text-rose-600" />
                            Place On Hold
                          </button>
                        )}
                      </div>
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
