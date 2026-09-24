import type { ReactNode } from 'react';
import { StudentShell } from '@/components/layout/student-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
