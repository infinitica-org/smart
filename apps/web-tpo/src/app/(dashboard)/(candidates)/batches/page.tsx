import type { Metadata } from 'next';
import { BatchesWorkspace } from '../../../../components/candidates/BatchesWorkspace';

export const metadata: Metadata = {
  title: 'Batches',
  description: 'Manage candidate cohorts and batches.',
};

export default function BatchesPage() {
  return <BatchesWorkspace />;
}
