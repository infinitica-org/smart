import type { ReactNode } from 'react';
import { TpoShell } from '../../components/tpo-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <TpoShell>{children}</TpoShell>;
}
