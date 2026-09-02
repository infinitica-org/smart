'use client';

import { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@smart/ui';

export function CandidateProvisioningModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
    }, 1500);
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
    }, 2000);
  };

  const handleDone = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131313] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">
            {step === 1 && 'Provision Candidates'}
            {step === 2 && 'Review & Map Columns'}
            {step === 3 && 'Provisioning Complete'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-8 bg-white/[0.02]">
              <UploadCloud className="w-10 h-10 text-[#00fad0] mb-4" />
              <p className="text-sm font-medium text-white mb-1">Drag and drop your roster</p>
              <p className="text-xs text-gray-500 text-center mb-6">
                Supports .csv, .xlsx up to 10MB.
                <br />
                Make sure it includes Name, Email, and Batch.
              </p>

              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={isProcessing}
                className="w-full flex justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {isProcessing ? 'Processing File...' : 'Browse Files'}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">File successfully parsed</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Found 42 valid candidate rows. 0 errors detected.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Preview
                </h3>
                <div className="border border-white/5 rounded-lg overflow-hidden text-sm">
                  <div className="grid grid-cols-3 bg-white/5 p-2 px-3 text-xs font-medium text-gray-400">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Batch</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 px-3 border-t border-white/5 text-gray-300">
                    <div className="truncate pr-2">John Doe</div>
                    <div className="truncate pr-2">john@example.com</div>
                    <div className="truncate">CS-2024</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 px-3 border-t border-white/5 text-gray-300">
                    <div className="truncate pr-2">Jane Smith</div>
                    <div className="truncate pr-2">jane@example.com</div>
                    <div className="truncate">CS-2024</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="min-w-[120px]"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Invite'}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-lg font-semibold text-white mb-1">Invites Sent Successfully!</p>
              <p className="text-sm text-gray-400 text-center mb-6">
                42 candidates have been provisioned and invited to join the platform.
              </p>

              <Button variant="primary" onClick={handleDone} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
