import type { ReactNode } from 'react';
import { LoginBrandPanel } from './login-brand-panel';

const authFontClass =
  'font-[family-name:var(--auth-font-sans,-apple-system,BlinkMacSystemFont,"Segoe_UI",sans-serif)]';

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`min-h-dvh w-full bg-white p-4 text-[#172033] lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-6 lg:p-6 ${authFontClass}`}
    >
      <LoginBrandPanel />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-2 py-10 lg:min-h-0 lg:overflow-y-auto">
        <div className="absolute right-2 top-2 flex items-center gap-2 text-sm font-medium lg:right-0 lg:top-0">
          <label className="sr-only" htmlFor="language">
            Language
          </label>
          <select
            id="language"
            defaultValue="en-US"
            className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-[#172033]"
          >
            <option value="en-US">English (US)</option>
          </select>
          <a
            href="/register"
            className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-[#172033] hover:bg-slate-50"
          >
            Register
          </a>
        </div>
        {children}
      </div>
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
