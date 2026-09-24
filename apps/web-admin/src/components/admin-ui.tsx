import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleAlert, Info } from 'lucide-react';
import { cn } from '@smart/ui';
import { Input } from '@smart/ui/input';
import { Label } from '@smart/ui/label';
import { Alert, AlertTitle } from '@smart/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@smart/ui/table';

/** Shared 36px/40px control surface — clean rounded-md border, high contrast. */
export const controlClassName =
  'h-9 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 shadow-2xs outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100';

/** Primary form-submit buttons (Save/Create/Invite/Filter) — solid black SaaS styling. */
export const controlButtonClassName =
  'h-9 rounded-md bg-zinc-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-black active:scale-[0.99] transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white';

export function AdminInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        'h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:border-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
        className,
      )}
      {...props}
    />
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: Omit<ComponentProps<'select'>, 'ref'>) {
  return (
    <select className={cn(controlClassName, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-6', className)}>{children}</div>;
}

export function FilterBar({ className, ...props }: Omit<ComponentProps<'div'>, 'ref'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-md border border-zinc-200/80 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:flex-wrap md:items-end',
        '[&>*:first-child]:min-w-[12rem] [&>*:first-child]:flex-1',
        '[&>*:not(:first-child):not(:last-child)]:min-w-[10rem] md:[&>*:not(:first-child):not(:last-child)]:w-48',
        className,
      )}
      {...props}
    />
  );
}

export function FormGrid({ className, ...props }: Omit<ComponentProps<'div'>, 'ref'>) {
  return <div className={cn('grid gap-4 md:grid-cols-2', className)} {...props} />;
}

export function FormActions({ className, ...props }: Omit<ComponentProps<'div'>, 'ref'>) {
  return <div className={cn('flex items-end md:col-span-2', className)} {...props} />;
}

export function InlineAlert({ tone = 'info', title }: { tone?: 'info' | 'danger'; title: string }) {
  return (
    <Alert
      variant={tone === 'danger' ? 'destructive' : 'default'}
      className="rounded-md border border-zinc-200/80 shadow-2xs"
    >
      {tone === 'danger' ? <CircleAlert className="size-4" /> : <Info className="size-4" />}
      <AlertTitle className="text-xs font-semibold">{title}</AlertTitle>
    </Alert>
  );
}

export function EmptyState({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50 text-zinc-600 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <p className="max-w-sm text-xs font-medium text-zinc-500 dark:text-zinc-400">{children}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: 'Active' | 'On hold' | 'Deactivated' | string }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" />
        {status}
      </span>
    );
  }
  if (status === 'On hold') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
        {status}
      </span>
    );
  }
  if (status === 'Deactivated') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 shadow-2xs dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300">
        <span className="size-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {status}
    </span>
  );
}

/** Renders a `risk.ts` integrity score band (CLEAN/MINOR/MAJOR) as a colored badge. */
export function SeverityBadge({ severity }: { severity: 'CLEAN' | 'MINOR' | 'MAJOR' | string }) {
  if (severity === 'MAJOR') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 shadow-2xs dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300">
        <span className="size-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
        High Risk
      </span>
    );
  }
  if (severity === 'MINOR') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
        Medium Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
      <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
      Clean / Low
    </span>
  );
}

export function VerificationBadge({
  status,
}: {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
}) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
        Verified
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 shadow-2xs dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300">
        <span className="size-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
        Rejected
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-2xs dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300">
        <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] animate-pulse" />
        Pending Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {status}
    </span>
  );
}

export function DataTable({
  headers,
  children,
  empty,
  emptyIcon,
}: {
  headers: (string | ReactNode)[];
  children: ReactNode;
  empty?: boolean;
  emptyIcon?: LucideIcon;
}) {
  if (empty) return <EmptyState icon={emptyIcon}>No rows to show.</EmptyState>;

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-200/80 bg-zinc-50/75 hover:bg-zinc-50/75 dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:bg-zinc-800/60">
              {headers.map((header, idx) => (
                <TableHead
                  key={typeof header === 'string' ? header : idx}
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100 text-xs dark:divide-zinc-800 [&_tr]:transition-colors [&_tr]:duration-150 [&_tr:hover]:bg-zinc-50/70 dark:[&_tr:hover]:bg-zinc-800/50">
            {children}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export { TableCell, TableRow };
