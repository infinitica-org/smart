'use client';

import Link from 'next/link';
import { Flag } from 'lucide-react';
import { AdminReportsList } from '@smart/ui';
import { PageHeader } from '@/components/page-header';
import { PageStack } from '@/components/admin-ui';
import { MessagingProvider } from '@/components/messaging-provider';

/**
 * Th6-430 — moderation queue. Each row opens /admin/reports/:id, where the audited reason dialog
 * guards the conversation. Only a SUPER_ADMIN may call the endpoint behind it.
 */
export default function ReportsPage() {
  return (
    <PageStack>
      <PageHeader
        icon={Flag}
        tone="inverse"
        title="Reports"
        description="Reports filed by users, newest first. Open one to review it; reading a conversation asks for a reason and is audited."
      />
      <MessagingProvider>
        <AdminReportsList linkComponent={Link} />
      </MessagingProvider>
    </PageStack>
  );
}
