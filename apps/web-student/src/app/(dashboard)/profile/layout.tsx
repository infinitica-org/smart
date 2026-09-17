import type { ReactNode } from 'react';

/** Cancel dashboard main padding so profile workspace sits flush under the navbar. */
export default function ProfileRouteLayout({ children }: { children: ReactNode }) {
  return <div className="-mx-4 -mt-6 mb-0 min-w-0 md:-mx-8 md:-mt-8">{children}</div>;
}
