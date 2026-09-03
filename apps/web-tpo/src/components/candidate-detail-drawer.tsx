'use client';

import { X } from 'lucide-react';
import { CandidateProfileCard } from '@smart/ui';

export function CandidateDetailDrawer({
  candidateId,
  isOpen,
  onClose,
}: {
  candidateId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !candidateId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0a0a0a] border-l border-white/5 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#131313]">
          <h2 className="text-lg font-semibold text-white">Candidate Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <CandidateProfileCard
            candidateId={candidateId}
            displayName="Mock Candidate"
            trackName="Software Engineering"
            headlineTier="GOLD"
            skills={[
              { name: 'React', status: 'VERIFIED' },
              { name: 'Node.js', status: 'IN_PROGRESS' },
              { name: 'System Design', status: 'LOCKED' },
            ]}
          />
        </div>
      </div>
    </>
  );
}
