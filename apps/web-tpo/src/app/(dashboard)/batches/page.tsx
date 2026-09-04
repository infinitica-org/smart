'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@smart/ui';
import type { BatchDto } from '@smart/contracts';
import { api } from '../../../lib/api';
import { Users, Plus, LayoutGrid, Loader2, AlertTriangle } from 'lucide-react';

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setBatches(await api.onboarding.listBatches());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load batches.'));
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.onboarding.createBatch({ name, code: code || undefined });
      setName('');
      setCode('');
      await load();
      setError(null);
    } catch {
      setError('Could not create batch.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="max-w-[1400px] mx-auto space-y-6 font-sans select-none">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-md border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Batches & Cohorts</h1>
            <span className="bg-teal-50 text-[#004c63] border border-teal-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {batches.length} Active
            </span>
          </div>
          <p className="text-slate-500 text-xs font-medium">
            Manage student graduating classes, track batch-level readiness, and provision access.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-md flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Batch Card */}
        <div className="lg:col-span-1">
          <Card className="bg-white border border-slate-200/80 shadow-sm p-6 rounded-md sticky top-24">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-md bg-teal-50 border border-teal-100 flex items-center justify-center text-[#004c63]">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Create New Batch</h2>
            </div>
            <p className="text-xs text-slate-500 mb-5 font-medium leading-relaxed">
              Set up a new cohort to group candidates for assessment tracking (e.g. CS 2025).
            </p>

            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Computer Science 2025"
                  className="w-full bg-slate-50/70 text-slate-900 text-sm rounded-md py-2.5 px-3.5 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#004c63] focus:ring-2 focus:ring-[#004c63]/15 transition-all placeholder:text-slate-400 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Batch Code{' '}
                  <span className="normal-case font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS-25"
                  className="w-full bg-slate-50/70 text-slate-900 text-sm rounded-md py-2.5 px-3.5 border border-slate-200 focus:bg-white focus:outline-none focus:border-[#004c63] focus:ring-2 focus:ring-[#004c63]/15 transition-all placeholder:text-slate-400 font-medium"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full bg-[#004c63] hover:bg-[#003a4d] text-white font-bold py-2.5 rounded-md shadow-sm transition-all mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Create Batch
                  </span>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Batch List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {batches.length === 0 ? (
              <div className="sm:col-span-2 bg-white border border-slate-200/80 shadow-sm rounded-md p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200/60">
                  <LayoutGrid className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No batches created yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Create your institution's first batch cohort using the quick setup form on the
                  left.
                </p>
              </div>
            ) : (
              batches.map((batch) => (
                <Link key={batch.batchId} href={`/batches/${batch.batchId}`}>
                  <Card className="bg-white border border-slate-200/80 shadow-sm p-6 hover:border-[#004c63]/40 transition-all hover:shadow-md cursor-pointer group h-full flex flex-col rounded-md relative overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 bg-teal-50 border border-teal-100 rounded-md flex items-center justify-center shrink-0 group-hover:bg-[#004c63] transition-all">
                        <Users className="w-5 h-5 text-[#004c63] group-hover:text-white transition-colors" />
                      </div>
                      <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-bold px-2.5 py-1 rounded-md tracking-wider">
                        {batch.code ?? 'NO-CODE'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#004c63] transition-colors line-clamp-1 mb-5">
                      {batch.name}
                    </h3>

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50/70 p-3 rounded-md border border-slate-100">
                        <div className="text-[11px] text-slate-500 mb-0.5 font-semibold">
                          Enrolled Members
                        </div>
                        <div className="text-base font-extrabold text-slate-900 tabular-nums">
                          {batch.memberCount}
                        </div>
                      </div>
                      <div className="bg-amber-50/60 p-3 rounded-md border border-amber-100/80">
                        <div className="text-[11px] text-amber-700 mb-0.5 font-semibold">
                          Pending Invites
                        </div>
                        <div className="text-base font-extrabold text-amber-700 tabular-nums">
                          {batch.pendingInviteCount}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
