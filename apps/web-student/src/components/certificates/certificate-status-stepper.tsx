'use client';

import type { CandidateCertificateStatus, CertificateSourceStatus } from '@smart/contracts';
import {
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  Sparkles,
  FileSearch,
  GraduationCap,
} from 'lucide-react';

export type CertificateLifecycleStage =
  'source check' | 'generate' | 'sit' | 'retry' | 'verified' | 'voided';

interface CertificateStatusStepperProps {
  status: CandidateCertificateStatus;
  sourceStatus?: CertificateSourceStatus;
  hasFileOrUrl?: boolean;
  hasSkills?: boolean;
  hasLearning?: boolean;
}

export function getLifecycleStage(
  status: CandidateCertificateStatus,
  sourceStatus?: CertificateSourceStatus,
  hasFileOrUrl = false,
  hasSkills = false,
  hasLearning = false,
): CertificateLifecycleStage {
  if (status === 'VOIDED' || sourceStatus === 'voided') {
    return 'voided';
  }
  if (status === 'VERIFIED' || sourceStatus === 'source_verified') {
    return 'verified';
  }
  if (status === 'REJECTED' || sourceStatus === 'source_failed') {
    return 'retry';
  }
  if (status === 'IN_VERIFICATION' || sourceStatus === 'pending') {
    if (hasFileOrUrl && hasSkills && hasLearning) {
      return 'source check';
    }
  }
  if (hasFileOrUrl && hasSkills) {
    return 'sit';
  }
  if (hasFileOrUrl) {
    return 'generate';
  }
  return 'source check';
}

const STAGES: {
  id: CertificateLifecycleStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'source check', label: 'Source Check', icon: FileSearch },
  { id: 'generate', label: 'Generate', icon: Sparkles },
  { id: 'sit', label: 'Sit Exam', icon: GraduationCap },
  { id: 'retry', label: 'Retry', icon: RefreshCw },
  { id: 'verified', label: 'Verified', icon: CheckCircle2 },
  { id: 'voided', label: 'Voided', icon: ShieldAlert },
];

export function CertificateStatusStepper({
  status,
  sourceStatus,
  hasFileOrUrl = false,
  hasSkills = false,
  hasLearning = false,
}: CertificateStatusStepperProps) {
  const currentStage = getLifecycleStage(
    status,
    sourceStatus,
    hasFileOrUrl,
    hasSkills,
    hasLearning,
  );

  const isTerminalVoid = currentStage === 'voided';
  const isTerminalVerified = currentStage === 'verified';
  const isRetry = currentStage === 'retry';

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Certification Lifecycle
          </h4>
          <p className="text-sm font-medium text-white capitalize">
            Current Stage:{' '}
            <span
              className={
                isTerminalVerified
                  ? 'text-success font-semibold'
                  : isTerminalVoid
                    ? 'text-danger font-semibold'
                    : isRetry
                      ? 'text-warning font-semibold'
                      : 'text-[#00fad0] font-semibold'
              }
            >
              {currentStage}
            </span>
          </p>
        </div>

        {isTerminalVerified && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Source Verified
          </span>
        )}
        {isRetry && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            <AlertCircle className="h-3.5 w-3.5" /> Fix & Retry
          </span>
        )}
        {isTerminalVoid && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
            <ShieldAlert className="h-3.5 w-3.5" /> Voided by Admin
          </span>
        )}
      </div>

      {/* Stepper Bar */}
      <div className="grid grid-cols-6 gap-1.5 pt-2">
        {STAGES.map((step) => {
          const isActive = step.id === currentStage;
          const Icon = step.icon;

          let bgStyle = 'border-white/10 bg-white/5 text-white/40';
          if (isActive) {
            if (step.id === 'verified')
              bgStyle =
                'border-success bg-success/20 text-success shadow-[0_0_12px_rgba(34,197,94,0.3)]';
            else if (step.id === 'voided')
              bgStyle =
                'border-danger bg-danger/20 text-danger shadow-[0_0_12px_rgba(239,68,68,0.3)]';
            else if (step.id === 'retry')
              bgStyle =
                'border-warning bg-warning/20 text-warning shadow-[0_0_12px_rgba(245,158,11,0.3)]';
            else
              bgStyle =
                'border-[#00fad0] bg-[#00fad0]/15 text-[#00fad0] shadow-[0_0_12px_rgba(0,250,208,0.3)]';
          }

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all ${bgStyle}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-medium leading-tight">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Detailed Status Guidance Box */}
      <div className="mt-1 rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs leading-relaxed text-white/70">
        {currentStage === 'source check' && (
          <p>
            <strong className="text-white">Source Check in Progress:</strong> We are inspecting the
            certificate details and source proof. Ensure your certificate number or direct
            verification URL is accurate.
          </p>
        )}
        {currentStage === 'generate' && (
          <p>
            <strong className="text-white">Proof Uploaded:</strong> Next, select the catalog skills
            that match this certification and describe your practical learning.
          </p>
        )}
        {currentStage === 'sit' && (
          <p>
            <strong className="text-white">Ready for Verification:</strong> Submit an endorsement
            request to a reviewer with a corporate work email address to finalize verification.
          </p>
        )}
        {currentStage === 'retry' && (
          <p className="text-warning/90">
            <strong className="text-warning">Source Check Failed:</strong> Automated or manual
            source check could not confirm this certificate. Please check the provider URL,
            certificate number, or re-upload a clear PDF/image file.
          </p>
        )}
        {currentStage === 'verified' && (
          <p className="text-success/90">
            <strong className="text-success">Certificate Verified:</strong> This certificate is
            authenticated and active on your profile.
          </p>
        )}
        {currentStage === 'voided' && (
          <p className="text-danger/90">
            <strong className="text-danger">Certificate Voided:</strong> This entry has been marked
            void by an administrator due to an integrity policy violation. It is permanently
            inactive.
          </p>
        )}
      </div>
    </div>
  );
}
