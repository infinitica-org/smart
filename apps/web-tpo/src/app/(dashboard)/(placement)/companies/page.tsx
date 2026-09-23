import type { Metadata } from 'next';
import { CompanyRepositoryWorkspace } from '../../../../components/company-repository-workspace';

export const metadata: Metadata = {
  title: 'Company Directory',
  description: 'Manage employer relationships, hiring partners, and company profiles.',
};

export default function CompanyRepositoryPage() {
  return <CompanyRepositoryWorkspace />;
}
