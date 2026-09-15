import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CircleAlert, CircleCheck, CircleMinus, Info } from 'lucide-react';
import { cn } from '@smart/ui';
import { Badge } from '@smart/ui/badge';
import { Input } from '@smart/ui/input';
import { Label } from '@smart/ui/label';
import { Alert, AlertTitle } from '@smart/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@smart/ui/table';

/** Shared 40px (Airbnb) control surface — muted fill, no extra border. */
export const controlClassName =
  'h-10 w-full min-w-0 rounded-xl bg-muted px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:bg-muted/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:bg-destructive/10';

/** Primary form-submit buttons (Save/Create/Invite/Filter) — pill shape + press feedback, matching the onboarding wizard's PrimaryButton. */
export const controlButtonClassName = 'h-10 rounded-full transition-all active:scale-[0.98]';

export function AdminInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn('h-10', className)} {...props} />;
}

export function NativeSelect({
  className,
  children,
  ...props
}: Omit<ComponentProps<'select'>, 'ref'>) {
  return (
    <select className={cn(controlClassName, 'cursor-pointer border-0', className)} {...props}>
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
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-8', className)}>{children}</div>;
}

export function FilterBar({ className, ...props }: Omit<ComponentProps<'div'>, 'ref'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end',
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
    <Alert variant={tone === 'danger' ? 'destructive' : 'default'}>
      {tone === 'danger' ? <CircleAlert /> : <Info />}
      <AlertTitle>{title}</AlertTitle>
    </Alert>
  );
}

export function EmptyState({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-card px-6 py-14 text-center">
      {Icon ? (
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-card-foreground">
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <p className="max-w-sm text-sm text-card-foreground/70">{children}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: 'Active' | 'On hold' | 'Deactivated' | string }) {
  if (status === 'Active') {
    return (
      <Badge className="bg-accent text-accent-foreground">
        <CircleCheck />
        {status}
      </Badge>
    );
  }
  if (status === 'On hold') {
    return (
      <Badge variant="destructive">
        <CircleAlert />
        {status}
      </Badge>
    );
  }
  if (status === 'Deactivated') {
    return (
      <Badge variant="secondary">
        <CircleMinus />
        {status}
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

/** Renders a `risk.ts` integrity score band (CLEAN/MINOR/MAJOR) as a colored badge. */
export function SeverityBadge({ severity }: { severity: 'CLEAN' | 'MINOR' | 'MAJOR' | string }) {
  if (severity === 'MAJOR') {
    return (
      <Badge variant="destructive">
        <CircleAlert />
        High
      </Badge>
    );
  }
  if (severity === 'MINOR') {
    return (
      <Badge className="bg-accent text-accent-foreground">
        <CircleMinus />
        Medium
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <CircleCheck />
      Low
    </Badge>
  );
}

export function DataTable({
  headers,
  children,
  empty,
  emptyIcon,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
  emptyIcon?: LucideIcon;
}) {
  if (empty) return <EmptyState icon={emptyIcon}>No rows to show.</EmptyState>;

  return (
    <div className="overflow-hidden rounded-2xl bg-card text-card-foreground [&_td]:py-3 [&_th]:py-3">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export { TableCell, TableRow };
