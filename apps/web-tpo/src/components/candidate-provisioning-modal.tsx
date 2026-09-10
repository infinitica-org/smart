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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/80 bg-slate-50/80">
          <h2 className="text-lg font-bold text-slate-900">
            {step === 1 && 'Provision Candidates'}
            {step === 2 && 'Review & Map Columns'}
            {step === 3 && 'Provisioning Complete'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#004C63]/30 rounded-2xl p-8 bg-[#F0FDFA]/40">
              <div className="size-12 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center mb-4 text-[#004C63]">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">
                Drag and drop your candidate roster
              </p>
              <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed font-medium">
                Supports .csv, .xlsx up to 10MB.
                <br />
                Make sure it includes Name, Email, and Batch.
              </p>

              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={isProcessing}
                className="w-full bg-[#004C63] hover:bg-[#0A4D5C] text-white flex justify-center gap-2 font-bold shadow-xs py-3 rounded-xl transition-all"
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
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">File successfully parsed</p>
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                    Found 42 valid candidate rows. 0 errors detected.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Preview
                </h3>
                <div className="border border-slate-200/80 rounded-xl overflow-hidden text-sm">
                  <div className="grid grid-cols-3 bg-slate-50 p-2.5 px-3 text-xs font-bold text-slate-600">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Batch</div>
                  </div>
                  <div className="grid grid-cols-3 p-2.5 px-3 border-t border-slate-100 text-slate-700 text-xs font-medium">
                    <div className="truncate pr-2">John Doe</div>
                    <div className="truncate pr-2">john@example.com</div>
                    <div className="truncate">CS-2024</div>
                  </div>
                  <div className="grid grid-cols-3 p-2.5 px-3 border-t border-slate-100 text-slate-700 text-xs font-medium">
                    <div className="truncate pr-2">Jane Smith</div>
                    <div className="truncate pr-2">jane@example.com</div>
                    <div className="truncate">CS-2024</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-900 font-semibold"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="bg-[#004C63] hover:bg-[#0A4D5C] text-white min-w-[130px] font-bold rounded-xl shadow-xs py-2.5"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Invite'}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-200">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-slate-900 mb-1">Invites Sent Successfully!</p>
              <p className="text-sm text-slate-500 text-center mb-6 font-medium">
                42 candidates have been provisioned and invited to join the platform.
              </p>

              <Button
                variant="primary"
                onClick={handleDone}
                className="w-full bg-[#004C63] hover:bg-[#0A4D5C] text-white font-bold rounded-xl py-3 shadow-xs"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
