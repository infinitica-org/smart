import type { LucideIcon } from 'lucide-react';
import { BarChart3, Briefcase, MapPin } from 'lucide-react';
import type { ProfileProgressInput } from './profile-progress';

export type DashboardStatusChip = {
  readonly icon: LucideIcon;
  readonly label: string;
};

function jobPreferences(input: ProfileProgressInput | null) {
  return input?.onboardingProfile?.jobPreferences ?? input?.onboardingDraft?.jobPreferences ?? null;
}

/** Informational chips derived from saved profile data — no hardcoded candidate fields. */
export function dashboardStatusChips(input: ProfileProgressInput | null): DashboardStatusChip[] {
  const chips: DashboardStatusChip[] = [];
  const prefs = jobPreferences(input);
  const location = prefs?.currentLocation?.trim();
  if (location) {
    chips.push({ icon: MapPin, label: location });
  }
  const openToWork =
    (prefs?.preferredLocations?.length ?? 0) > 0 ||
    (prefs?.preferredWorkModes?.length ?? 0) > 0 ||
    prefs?.expectedCtcLakhs !== undefined;
  if (openToWork) {
    chips.push({ icon: Briefcase, label: 'Open to opportunities' });
  }
  chips.push({ icon: BarChart3, label: 'Build · Verify · Grow' });
  return chips;
}
