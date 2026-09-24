import type { Metadata } from 'next';
import { UniversityReportsExport } from '../../../components/reports/UniversityReportsExport';

export const metadata: Metadata = {
  title: 'Reports & Analytics',
  description:
    'Download CSV reports for cohort readiness, placement opportunities, and employer engagement.',
};

export default function ReportsPage() {
  return <UniversityReportsExport />;
}
