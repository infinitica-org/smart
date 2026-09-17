import { queryKeys } from '@smart/api-client';
import type { AuthenticatedUser, TrackDto } from '@smart/contracts';
import { useQuery } from '@smart/ui';
import { api } from './api';
import { headlineRoleForPrimaryTrack } from './candidate-streams';

/** The signed-in candidate — the one real source for name/role/track everywhere in the console. */
export function useCurrentUser() {
  return useQuery({ queryKey: queryKeys.me(), queryFn: () => api.auth.me() });
}

/** All catalog tracks, for resolving `primaryTrack`'s code to a readable name. */
export function useTracks() {
  return useQuery({ queryKey: queryKeys.tracks(), queryFn: () => api.catalog.tracks() });
}

export function firstNameOf(fullName: string | undefined): string {
  return fullName?.trim().split(/\s+/u)[0] ?? '';
}

export function initialsOf(fullName: string | undefined): string {
  const parts = fullName?.trim().split(/\s+/u).filter(Boolean) ?? [];
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || '—';
}

export function trackNameFor(tracks: TrackDto[] | undefined, code: string | null): string | null {
  if (!code || !tracks) return null;
  return tracks.find((track) => track.code === code)?.name ?? null;
}

/** Dashboard/profile subtitle — stream label from onboarding, not the catalog track title. */
export function headlineFor(
  user: AuthenticatedUser | undefined,
  tracks: TrackDto[] | undefined,
): string {
  if (!user) return '';
  const streamRole = headlineRoleForPrimaryTrack(user.primaryTrack);
  if (streamRole) return `${streamRole} candidate`;
  const trackName = trackNameFor(tracks, user.primaryTrack);
  return trackName ? `${trackName} candidate` : 'SMART candidate';
}
