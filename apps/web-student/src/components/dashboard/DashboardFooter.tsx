export function DashboardFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-6 flex flex-col gap-3 border-t border-[var(--ds-border-subtle)] pt-5 text-[13px] text-[var(--ds-text-muted)] sm:flex-row sm:items-center sm:justify-between">
      <p>© {year} SMART. Build. Verify. Grow.</p>

      <nav aria-label="Legal and help" className="flex flex-wrap gap-4">
        <a href="#" className="transition hover:text-[var(--ds-text-secondary)]">
          Privacy
        </a>

        <a href="#" className="transition hover:text-[var(--ds-text-secondary)]">
          Terms
        </a>

        <a href="#" className="transition hover:text-[var(--ds-text-secondary)]">
          Help
        </a>
      </nav>
    </footer>
  );
}
