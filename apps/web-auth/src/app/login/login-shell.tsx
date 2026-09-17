import type { ReactNode } from 'react';

const authFontClass =
  'font-[family-name:var(--auth-font-sans,-apple-system,BlinkMacSystemFont,"Segoe_UI",sans-serif)]';

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`min-h-dvh w-full bg-white text-[#172033] flex flex-col items-center justify-center px-4 py-10 sm:px-6 ${authFontClass}`}
    >
      {children}
    </div>
  );
}

export function LoginLoadingState() {
  return (
    <LoginShell>
      <div
        className="flex w-full max-w-[420px] flex-col items-center gap-4 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#172033]/15 border-t-[#172033]" />
        <p className="text-sm text-[#64748b]">Preparing sign-in…</p>
      </div>
    </LoginShell>
  );
}
