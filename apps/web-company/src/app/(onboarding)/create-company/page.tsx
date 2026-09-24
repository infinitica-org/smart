import Link from 'next/link';
import { card, input, label, primaryButton } from '../../../lib/ui';

export const metadata = { title: 'Create or join a company' };

export default function CreateCompanyPage() {
  return (
    <section className={card}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--ds-text-subtle)]">
        Step 2 of 3
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ds-text)]">
        Create or join your company
      </h1>
      <p className="mt-1.5 text-[13px] text-[var(--ds-text-muted)]">
        If your company already exists on SMART, we’ll send your teammates a request to approve you.
      </p>

      <form className="mt-6 space-y-4">
        <div>
          <label htmlFor="company-name" className={label}>
            Company name
          </label>
          <input id="company-name" type="text" placeholder="Acme" className={input} />
        </div>
        <Link href="/verify" className={`${primaryButton} w-full`}>
          Request to join / create
        </Link>
      </form>
    </section>
  );
}
