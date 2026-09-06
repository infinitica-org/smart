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
    <main className="max-w-[1400px] mx-auto space-y-6 font-sans select-none pb-12 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 p-6 md:p-7 rounded-xl border border-zinc-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
              Batches & Cohorts
            </h1>
            <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
              {batches.length} Active
            </span>
          </div>
          <p className="text-zinc-400 text-xs md:text-sm font-medium">
            Manage candidate graduating classes, track batch-level readiness, and provision access.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Batch Card */}
        <div className="lg:col-span-1">
          <Card className="bg-zinc-900/80 border border-zinc-800 shadow-sm p-6 rounded-xl sticky top-24">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Create New Batch</h2>
            </div>
            <p className="text-xs text-zinc-400 mb-5 font-medium leading-relaxed">
              Set up a new cohort to group candidates for assessment tracking (e.g. CS 2025).
            </p>

            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Computer Science 2025"
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2.5 px-3.5 border border-zinc-800 focus:bg-zinc-950 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-500 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Batch Code{' '}
                  <span className="normal-case font-normal text-zinc-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS-25"
                  className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-lg py-2.5 px-3.5 border border-zinc-800 focus:bg-zinc-950 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-500 font-medium"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-sm transition-all mt-2 border border-emerald-500/50"
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
              <div className="sm:col-span-2 bg-zinc-900/80 border border-zinc-800 shadow-sm rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
                  <LayoutGrid className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No batches created yet</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Create your institution's first batch cohort using the setup form on the left.
                </p>
              </div>
            ) : (
              batches.map((batch) => (
                <Link key={batch.batchId} href={`/batches/${batch.batchId}`}>
                  <Card className="bg-zinc-900/80 border border-zinc-800 shadow-sm p-6 hover:border-emerald-500/40 transition-all cursor-pointer group h-full flex flex-col rounded-xl relative overflow-hidden">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-emerald-600 transition-all">
                        <Users className="w-5 h-5 text-zinc-300 group-hover:text-white transition-colors" />
                      </div>
                      <span className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] font-mono font-bold px-2.5 py-1 rounded-md tracking-wider">
                        {batch.code ?? 'NO-CODE'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-5">
                      {batch.name}
                    </h3>

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/80">
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        <div className="text-[11px] text-zinc-400 mb-0.5 font-semibold">
                          Enrolled Members
                        </div>
                        <div className="text-base font-extrabold text-white tabular-nums">
                          {batch.memberCount}
                        </div>
                      </div>
                      <div className="bg-amber-950/40 p-3 rounded-lg border border-amber-800/60">
                        <div className="text-[11px] text-amber-400 mb-0.5 font-semibold">
                          Pending Invites
                        </div>
                        <div className="text-base font-extrabold text-amber-400 tabular-nums">
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
