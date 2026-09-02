'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Input } from '@smart/ui';
import type { BatchDto } from '@smart/contracts';
import { api } from '../../../lib/api';
import { Users, Plus, ChevronRight, LayoutGrid, Loader2, AlertTriangle } from 'lucide-react';

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
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Batches</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage your student cohorts, track readiness by graduating class, and provision access.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Batch */}
        <div className="lg:col-span-1">
          <Card className="bg-[#131313] border-white/5 p-5 sticky top-24">
            <h3 className="text-lg font-medium text-white mb-1">Create New Batch</h3>
            <p className="text-sm text-gray-400 mb-6">
              Set up a new cohort to group candidates (e.g. CS 2024).
            </p>

            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Batch Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Computer Science 2025"
                  className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Batch Code (Optional)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS-25"
                  className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full bg-[#00fad0] hover:bg-[#00fad0]/90 text-white mt-2"
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
              <div className="sm:col-span-2 bg-[#131313] border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <LayoutGrid className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No batches yet</h3>
                <p className="text-sm text-gray-400">
                  Create your first batch using the form on the left.
                </p>
              </div>
            ) : (
              batches.map((batch) => (
                <Link key={batch.batchId} href={`/batches/${batch.batchId}`}>
                  <Card className="bg-[#131313] border-white/5 p-5 hover:border-white/20 transition-all hover:bg-white/[0.02] cursor-pointer group h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#00fad0]/10 transition-colors">
                        <Users className="w-5 h-5 text-gray-400 group-hover:text-[#00fad0]" />
                      </div>
                      <span className="bg-white/5 text-gray-300 text-[10px] font-mono px-2 py-1 rounded">
                        {batch.code ?? 'NO-CODE'}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white group-hover:text-[#00fad0] transition-colors line-clamp-1 mb-4">
                      {batch.name}
                    </h3>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Members</div>
                        <div className="text-sm font-medium text-white">{batch.memberCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Pending Invites</div>
                        <div className="text-sm font-medium text-amber-400">
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
