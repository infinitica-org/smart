'use client';

import { DataRequestsCard } from '@/components/account/DataRequestsCard';
import { DeactivateAccountCard } from '@/components/account/DeactivateAccountCard';
import { DiscoverabilityCard } from '@/components/account/DiscoverabilityCard';
import { MessagingPreferenceCard } from '@/components/account/MessagingPreferenceCard';
import { PersonalInfoCard } from '@/components/account/PersonalInfoCard';
import { ProfileViewsSettingCard } from '@/components/account/ProfileViewsSettingCard';
import { VisibilitySettingsCard } from '@/components/public-profile/visibility-settings-card';

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pt-2 pb-16 font-sans">
      <header>
        <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
          Settings
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Manage your personal details, privacy and account.
        </p>
      </header>
      <PersonalInfoCard />
      <VisibilitySettingsCard />
      <DiscoverabilityCard />
      <MessagingPreferenceCard />
      <ProfileViewsSettingCard />
      <DataRequestsCard />
      <DeactivateAccountCard />
    </div>
  );
}
