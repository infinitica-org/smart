import { TRACK_DEFINITIONS, type TrackCode } from '@smart/contracts';

export function initialsFromFullName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function givenNameFromFullName(fullName: string): string {
  return fullName.trim().split(/\s+/u).filter(Boolean)[0] ?? fullName.trim();
}

export function trackDisplayName(trackCode: string | null | undefined): string | null {
  if (!trackCode) return null;
  return TRACK_DEFINITIONS.find((track) => track.code === trackCode)?.name ?? trackCode;
}

export function profileSubtitle(input: {
  institutionName: string | null;
  primaryTrack: TrackCode | string | null;
  latestRole?: string;
  latestCompany?: string;
}): string | null {
  const role = input.latestRole?.trim();
  const company = input.latestCompany?.trim();
  if (role && company) return `${role} · ${company}`;
  if (role) return role;

  const track = trackDisplayName(input.primaryTrack);
  const institution = input.institutionName?.trim();
  if (track && institution) return `${track} · ${institution}`;
  if (track) return track;
  if (institution) return institution;
  return null;
}
