'use client';

import { useEffect, useState } from 'react';
import type { NotificationDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { api } from '@/lib/api';

function formatApiError(error: unknown, fallback: string): string {
  if (isSmartApiError(error) && error.details.length > 0) {
    return error.details.map((detail) => `${detail.path}: ${detail.message}`).join(' ');
  }
  if (isSmartApiError(error)) return error.message;
  return fallback;
}

export default function StudentTrustNoticesPage() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Appeal Modal State
  const [appealModal, setAppealModal] = useState<{
    open: boolean;
    enforcementActionId: string;
    reason: string;
    docKeys: string;
  } | null>(null);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.trust.getTrustNotifications();
      setNotifications(data ?? []);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load notifications from server.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications().catch(() => {});
  }, []);

  async function handleMarkRead(notificationId: string) {
    try {
      await api.trust.markTrustNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
    } catch {
      /* ignore */
    }
  }

  async function handleSubmitAppeal() {
    if (!appealModal) return;
    if (appealModal.reason.trim().length < 10) {
      setError('Please provide a detailed appeal reason (at least 10 characters).');
      return;
    }

    try {
      const docKeys = appealModal.docKeys
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.trust.submitAppeal({
        enforcementActionId: appealModal.enforcementActionId,
        reason: appealModal.reason.trim(),
        supportingDocKeys: docKeys,
      });

      setNotice('Appeal submitted successfully. Our Trust & Safety team will review your case.');
      setAppealModal(null);
    } catch (err) {
      setError(formatApiError(err, 'Failed to submit appeal.'));
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
          Account & Trust Notices
        </h1>
        <p className="text-sm text-zinc-600">
          Review administrative notices, status updates, and submit formal appeals for account
          actions.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="font-semibold text-zinc-900">Your account is in good standing</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No active sanctions, integrity flags, or enforcement notices have been issued for your
              candidate account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => (
            <Card
              key={item.notificationId}
              className={`border-l-4 ${item.readAt ? 'border-l-zinc-300' : 'border-l-amber-500 bg-amber-50/20'}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-zinc-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    {item.title}
                  </CardTitle>
                  <span className="text-xs font-mono text-zinc-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <CardDescription className="text-xs text-zinc-600">
                  Notice ID: {item.notificationId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-800 leading-relaxed">{item.body}</p>
                <div className="flex items-center justify-between pt-2">
                  {!item.readAt ? (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.notificationId)}
                      className="text-xs font-medium text-zinc-600 hover:underline"
                    >
                      Mark as Read
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400">Read</span>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() =>
                      setAppealModal({
                        open: true,
                        enforcementActionId: item.notificationId,
                        reason: '',
                        docKeys: '',
                      })
                    }
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Submit Appeal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Appeal Submission Modal */}
      {appealModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>Submit Formal Appeal</CardTitle>
              <CardDescription>
                Provide details and evidence to request review of account action.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-xs font-semibold text-zinc-700 mb-1">
                  Appeal Rationale & Explanation (Min 10 chars)
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  className="w-full rounded-md border border-zinc-200 bg-white p-2.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                  value={appealModal.reason}
                  onChange={(e) => setAppealModal({ ...appealModal, reason: e.target.value })}
                  placeholder="Explain why you believe this sanction was issued in error, detailing your identity or technical setup..."
                />
              </div>

              <div>
                <label htmlFor="docKeys" className="block text-xs font-semibold text-zinc-700 mb-1">
                  Supporting Document Keys (Comma separated, optional)
                </label>
                <input
                  id="docKeys"
                  type="text"
                  className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                  value={appealModal.docKeys}
                  onChange={(e) => setAppealModal({ ...appealModal, docKeys: e.target.value })}
                  placeholder="doc_123, doc_456"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAppealModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-zinc-900 text-white gap-1"
                  onClick={handleSubmitAppeal}
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Appeal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
