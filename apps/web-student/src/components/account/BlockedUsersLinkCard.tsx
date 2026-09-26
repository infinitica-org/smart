import Link from 'next/link';
import { SettingsCard } from './account-ui';

/** Th6-427 — Settings entry to the blocked users page. */
export function BlockedUsersLinkCard() {
  return (
    <SettingsCard
      title="Blocked users"
      description="People you have blocked can't message you. Review them and unblock anyone."
    >
      <Link
        href="/settings/blocked"
        className="inline-flex text-sm font-semibold text-zinc-900 underline dark:text-white"
      >
        Manage blocked users
      </Link>
    </SettingsCard>
  );
}
