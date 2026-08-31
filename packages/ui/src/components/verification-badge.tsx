import type { HTMLAttributes } from 'react';
import { CheckCircle, Clock, AlertTriangle, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/cn';

export type VerificationState =
  | 'DECLARED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'LOCKED'
  | 'VERIFIED'
  | 'EXPIRING'
  | 'EXPIRING_SOON'
  | 'BEGINNER_REATTEMPT';

export interface VerificationBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: VerificationState | string;
  variant?: 'solid' | 'outline';
}

interface StateStyle {
  label: string;
  classNameSolid: string;
  classNameOutline: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATE_CONFIGS: Record<string, StateStyle> = {
  VERIFIED: {
    label: 'Verified',
    classNameSolid: 'bg-success text-[#070707] border-transparent',
    classNameOutline: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    classNameSolid: 'bg-info text-[#070707] border-transparent',
    classNameOutline: 'bg-info/10 text-info border-info/30',
    icon: Clock,
  },
  // Alias for IN_PROGRESS
  DECLARED: {
    label: 'Declared',
    classNameSolid: 'bg-info text-[#070707] border-transparent',
    classNameOutline: 'bg-info/10 text-info border-info/30',
    icon: Clock,
  },
  BEGINNER_REATTEMPT: {
    label: 'Reattempting',
    classNameSolid: 'bg-info text-[#070707] border-transparent',
    classNameOutline: 'bg-info/10 text-info border-info/30',
    icon: Clock,
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    classNameSolid: 'bg-warning text-[#070707] border-transparent',
    classNameOutline: 'bg-warning/10 text-warning border-warning/30',
    icon: AlertTriangle,
  },
  LOCKED: {
    label: 'Locked',
    classNameSolid: 'bg-danger text-white border-transparent',
    classNameOutline: 'bg-danger/10 text-danger border-danger/30',
    icon: Lock,
  },
  EXPIRING: {
    label: 'Expiring Soon',
    classNameSolid: 'bg-warning text-[#070707] border-transparent',
    classNameOutline: 'bg-transparent text-warning border-warning',
    icon: AlertCircle,
  },
  EXPIRING_SOON: {
    label: 'Expiring Soon',
    classNameSolid: 'bg-warning text-[#070707] border-transparent',
    classNameOutline: 'bg-transparent text-warning border-warning',
    icon: AlertCircle,
  },
};

export function VerificationBadge({
  status,
  variant = 'solid',
  className,
  ...props
}: VerificationBadgeProps) {
  // Normalize state parameter
  const normalizedStatus = (status || '').toUpperCase();
  const config = STATE_CONFIGS[normalizedStatus] || {
    label: status || 'Unknown',
    classNameSolid: 'bg-brand-700 text-paper border-transparent',
    classNameOutline: 'bg-transparent text-[var(--text-primary)] border-[var(--surface-border)]',
    icon: Clock,
  };

  const IconComponent = config.icon;
  const styleClass = variant === 'solid' ? config.classNameSolid : config.classNameOutline;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-all select-none',
        styleClass,
        className,
      )}
      role="status"
      aria-label={`Verification status: ${config.label}`}
      {...props}
    >
      <IconComponent className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
