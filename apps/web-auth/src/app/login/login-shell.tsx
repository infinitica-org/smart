import type { ReactNode } from 'react';

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#F3F4F6] text-slate-900 flex flex-col items-center justify-center relative p-4 font-sans select-none">
      {children}
    </div>
  );
}

export function LoginLoadingState() {
  return (
    <LoginShell>
      <div
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xs text-center"
        role="status"
        aria-live="polite"
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#004C63]/25 border-t-[#004C63]" />
        <p className="text-xs font-medium text-slate-500">Preparing sign-in…</p>
      </div>
    </LoginShell>
  );
}
