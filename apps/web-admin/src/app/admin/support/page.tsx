'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  History,
  LifeBuoy,
  LogOut,
  Search,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';
import type {
  SupportDiagnosticResponse,
  SupportHistoryResponse,
  SupportSessionResponse,
} from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  EmptyState,
  Field,
  InlineAlert,
  PageStack,
  StatusBadge,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

interface UserSearchResult {
  id: string;
  email: string;
  fullName: string;
  role: string;
  institutionId?: string | null;
  companyId?: string | null;
  heldAt?: string | null;
  deactivatedAt?: string | null;
}

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<SupportDiagnosticResponse | null>(null);
  const [history, setHistory] = useState<SupportHistoryResponse | null>(null);

  // Active impersonation state
  const [activeSession, setActiveSession] = useState<SupportSessionResponse | null>(null);

  // Grant creation form state
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [rationale, setRationale] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      void loadHistory();
    }
  }, [activeTab]);

  async function loadHistory() {
    try {
      const data = await api.support.getHistory();
      setHistory(data);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load support history.'));
    }
  }

  async function handleSearch(event?: FormEvent) {
    if (event) event.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = (await api.support.lookupUser(q)) as UserSearchResult[];
      setSearchResults(results);
      if (results.length > 0) {
        const first = results[0];
        if (first) {
          setSelectedUser(first);
          await loadDiagnostics(first.id);
        }
      } else {
        setSelectedUser(null);
        setDiagnostics(null);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to search accounts. Enter a valid ID, email, or name.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadDiagnostics(userId: string) {
    try {
      const res = await api.support.getDiagnostics(userId);
      setDiagnostics(res);
    } catch {
      setDiagnostics(null);
    }
  }

  async function handleSelectUser(user: UserSearchResult) {
    setSelectedUser(user);
    await loadDiagnostics(user.id);
  }

  async function handleStartImpersonation() {
    if (!selectedUser) return;
    if (!ticketId.trim() || !/^[A-Za-z0-9_-]{3,64}$/.test(ticketId.trim())) {
      setError('Ticket ID must be 3-64 alphanumeric, hyphen, or underscore characters.');
      return;
    }
    if (rationale.trim().length < 8) {
      setError('Audit rationale must be at least 8 characters.');
      return;
    }

    setGrantLoading(true);
    setError(null);
    try {
      // 1. Create time-boxed grant
      const grant = await api.support.createGrant({
        targetUserId: selectedUser.id,
        ticketId: ticketId.trim(),
        rationale: rationale.trim(),
        ttlSeconds: 900,
      });

      // 2. Exchange grant for delegated session
      const session = await api.support.impersonate({
        grantId: grant.grantId,
      });

      setActiveSession(session);
      setShowImpersonateModal(false);
      setTicketId('');
      setRationale('');
      setNotice(`Delegated read-only support session active for ${selectedUser.fullName}.`);
    } catch (err) {
      setError(formatApiError(err, 'Failed to initiate support impersonation session.'));
    } finally {
      setGrantLoading(false);
    }
  }

  async function handleEndSession() {
    try {
      await api.support.endSession();
      setActiveSession(null);
      setNotice('Delegated support session ended.');
    } catch (err) {
      setError(formatApiError(err, 'Failed to end support session.'));
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={LifeBuoy}
        title="Admin Support & Delegated Access"
        description="Search user accounts, review live diagnostic state, issue time-boxed support access grants, and perform audited read-only impersonation sessions."
      />

      {/* Active Impersonation Session Banner */}
      {activeSession ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 animate-pulse" />
            <div>
              <p className="font-bold">Active Delegated Support Session (Read-Only Enforcement)</p>
              <p className="text-xs opacity-90">
                Session ID: <code className="font-mono">{activeSession.sessionId}</code> · Target
                User: <code className="font-mono">{activeSession.targetUserId}</code> · Expires:{' '}
                {new Date(activeSession.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void handleEndSession()}
            className="gap-1.5 font-bold"
          >
            <LogOut className="h-4 w-4" />
            End Session
          </Button>
        </div>
      ) : null}

      {error ? <InlineAlert tone="danger" title={error} /> : null}

      {notice ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-4 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'search'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          User Diagnostics & Impersonation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'history'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4" />
          Support Audit History
        </button>
      </div>

      {activeTab === 'search' ? (
        <>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <AdminInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by email, name, UUID, username, or slug..."
                className="pl-11 py-3 text-sm bg-card border-border rounded-xl shadow-xs"
              />
            </div>
            <Button type="submit" className="bg-foreground text-background font-bold px-6">
              {loading ? 'Searching…' : 'Search Accounts'}
            </Button>
          </form>

          {/* Grid: Search Results & Diagnostics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Results List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Matching Database Accounts</CardTitle>
                <CardDescription>{searchResults.length} accounts found</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Enter email, name, or User UUID to lookup accounts directly from PostgreSQL.
                  </p>
                ) : (
                  searchResults.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    return (
                      <div
                        key={user.id}
                        onClick={() => void handleSelectUser(user)}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? 'border-foreground bg-muted shadow-xs'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground">
                            {user.fullName}
                          </span>
                          <StatusBadge
                            status={
                              user.deactivatedAt
                                ? 'Deactivated'
                                : user.heldAt
                                  ? 'On Hold'
                                  : 'Active'
                            }
                          />
                        </div>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">{user.email}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground font-semibold">
                          Role: {user.role}
                        </p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Selected User Diagnostics */}
            {selectedUser ? (
              <Card className="lg:col-span-2">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">
                          {selectedUser.fullName}
                        </h2>
                        <StatusBadge
                          status={
                            selectedUser.deactivatedAt
                              ? 'Deactivated'
                              : selectedUser.heldAt
                                ? 'On Hold'
                                : 'Active'
                          }
                        />
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">
                        {selectedUser.email} · ID: {selectedUser.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs font-semibold border-border hover:bg-muted"
                        onClick={() => setShowImpersonateModal(true)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Impersonate (View-As)
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-5">
                  {diagnostics ? (
                    <div className="rounded-xl border border-border bg-muted/40 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Live System Diagnostics
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Account State</span>
                          <span className="font-semibold text-foreground">
                            {diagnostics.accountState}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">User Role</span>
                          <span className="font-mono font-semibold text-foreground">
                            {diagnostics.role}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Campus Institution</span>
                          <span className="font-mono text-foreground">
                            {diagnostics.institutionId ?? 'None (Standalone / Admin)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Onboarding Status</span>
                          <span className="font-semibold text-foreground">
                            {diagnostics.onboardingCompleted ? 'Completed' : 'Incomplete'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Verified Skill Count</span>
                          <span className="font-mono text-teal-600 font-bold">
                            {diagnostics.verifiedSkillCount ?? 0} verified skills
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Loading diagnostics...</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="lg:col-span-2 flex items-center justify-center p-12">
                <EmptyState icon={User}>
                  Search and select an account above to inspect system diagnostics and initiate
                  support access.
                </EmptyState>
              </Card>
            )}
          </div>
        </>
      ) : (
        /* Audit History Tab */
        <Card>
          <CardHeader>
            <CardTitle>Support Access Audit Logs</CardTitle>
            <CardDescription>
              Audited trail of support access grants, session revocations, and impersonation
              starts/ends.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history?.items && history.items.length > 0 ? (
              <div className="space-y-3">
                {history.items.map((item) => (
                  <div
                    key={item.auditLogId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3.5 text-xs bg-card"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-foreground">{item.action}</span>
                        <StatusBadge status={item.resourceType} />
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Actor: {item.actorEmail ?? item.actorId} ({item.actorRole ?? 'AGENT'}) ·
                        Target: {item.resourceId}
                      </p>
                      {item.reasonCode ? (
                        <p className="mt-0.5 text-muted-foreground">
                          Ticket ID:{' '}
                          <span className="font-mono font-semibold">{item.reasonCode}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-2 sm:mt-0 text-right text-muted-foreground font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock}>No support access audit history found.</EmptyState>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grant & Impersonate Modal */}
      {showImpersonateModal && selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">
                  Initiate Support Impersonation Session
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImpersonateModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold">⚠️ Server-Enforced Read-Only Session</p>
              <p className="mt-0.5 opacity-90">
                You are requesting delegated access for <strong>{selectedUser.fullName}</strong> (
                {selectedUser.email}). All state-mutating actions (POST, PUT, PATCH, DELETE) will be
                blocked at the API gateway level.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Support Ticket ID (Required)">
                <AdminInput
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="e.g. TICK-8821 (3-64 alphanumeric/dash/underscore chars)"
                />
              </Field>

              <Field label="Audit Rationale (Required)">
                <AdminInput
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Explain why support impersonation is needed (min 8 chars)..."
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowImpersonateModal(false)}
                disabled={grantLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 text-white font-bold hover:bg-amber-700"
                onClick={() => void handleStartImpersonation()}
                disabled={grantLoading}
              >
                {grantLoading ? 'Granting Access…' : 'Grant & Start Session'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageStack>
  );
}
