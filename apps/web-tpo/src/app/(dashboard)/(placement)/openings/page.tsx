import type { Metadata } from 'next';
import { OpeningsWorkspace } from '@/components/openings-workspace';

export const metadata: Metadata = {
  title: 'Job Openings',
  description: 'Manage placement job openings, applications, and student eligibility.',
};

export default function OpeningsPage() {
  return <OpeningsWorkspace />;
}
