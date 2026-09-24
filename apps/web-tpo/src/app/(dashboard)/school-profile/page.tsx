import type { Metadata } from 'next';
import { SchoolProfileWorkspace } from '../../../components/school/SchoolProfileWorkspace';

export const metadata: Metadata = {
  title: 'School Profile',
  description: 'Manage your institution public profile, branding, and employer-facing details.',
};

export default function SchoolProfilePage() {
  return <SchoolProfileWorkspace />;
}
