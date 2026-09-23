import type { HTMLAttributes } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  FileEdit,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, type BadgeVariant } from './badge';

export type WorkflowStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'failed'
  | 'rejected'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'approved';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: WorkflowStatus;
  label?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  WorkflowStatus,
  { variant: BadgeVariant; defaultLabel: string; icon: typeof Clock }
> = {
  pending: { variant: 'warning', defaultLabel: 'Pending', icon: Clock },
  in_progress: { variant: 'info', defaultLabel: 'In Progress', icon: Loader2 },
  completed: { variant: 'success', defaultLabel: 'Completed', icon: CheckCircle2 },
  verified: { variant: 'teal', defaultLabel: 'Verified', icon: ShieldCheck },
  failed: { variant: 'destructive', defaultLabel: 'Failed', icon: AlertCircle },
  rejected: { variant: 'destructive', defaultLabel: 'Rejected', icon: XCircle },
  active: { variant: 'success', defaultLabel: 'Active', icon: CheckCircle2 },
  inactive: { variant: 'secondary', defaultLabel: 'Inactive', icon: XCircle },
  draft: { variant: 'secondary', defaultLabel: 'Draft', icon: FileEdit },
  approved: { variant: 'success', defaultLabel: 'Approved', icon: CheckCircle2 },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)} {...props}>
      {showIcon && (
        <Icon
          className={cn('size-3 shrink-0', status === 'in_progress' && 'animate-spin')}
          aria-hidden
        />
      )}
      <span>{displayLabel}</span>
    </Badge>
  );
}
