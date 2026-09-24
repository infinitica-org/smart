import Link from 'next/link';
import { UploadCloud } from 'lucide-react';
import { card, input, label, primaryButton } from '../../../lib/ui';

export const metadata = { title: 'Verify your company' };

export default function VerifyCompanyPage() {
  return (
    <section className={card}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ds-text-subtle)]">
        Step 3 of 3
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ds-text)]">
        Verify your company
      </h1>
      <p className="mt-1.5 text-[13px] text-[var(--ds-text-muted)]">
        Business registration number or government ID, so students trust who is reaching out.
      </p>

      <form className="mt-6 space-y-4">
        <div>
          <label htmlFor="reg-number" className={label}>
            Business registration number
          </label>
          <input
            id="reg-number"
            type="text"
            placeholder="e.g. U74999KA2020PTC123456"
            className={input}
          />
        </div>

        <div>
          <span className={label}>Government ID</span>
          <label
            htmlFor="gov-id"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border border-dashed border-[var(--ds-border-hover)] bg-[var(--ds-surface-muted)] px-4 py-8 text-center transition-colors hover:bg-white"
          >
            <UploadCloud className="size-6 text-[var(--ds-text-subtle)]" aria-hidden />
            <span className="text-[13px] font-semibold text-[var(--ds-text)]">
              Upload government ID
            </span>
            <span className="text-[12px] text-[var(--ds-text-muted)]">
              PDF, JPG or PNG up to 10MB
            </span>
            <input id="gov-id" type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
          </label>
        </div>

        <Link href="/" className={`${primaryButton} w-full`}>
          Continue
        </Link>
      </form>
    </section>
  );
}
