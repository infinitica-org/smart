import type { Metadata } from 'next';
import { UniversitySettings } from '../../../components/settings/UniversitySettings';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage institution domains, staff permissions, and workspace preferences.',
};

export default function SettingsPage() {
  return <UniversitySettings />;
}
