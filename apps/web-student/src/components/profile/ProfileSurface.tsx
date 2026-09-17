'use client';

import { profileCardClass } from '@/lib/profile-ui-classes';

export function ProfileSurface({ children }: { children: React.ReactNode }) {
  return <div className={profileCardClass}>{children}</div>;
}
