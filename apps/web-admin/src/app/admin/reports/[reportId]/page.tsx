'use client';

import { use } from 'react';
import { ReportedConversationView } from '@smart/ui';
import { PageHeader } from '@/components/page-header';
import { PageStack } from '@/components/admin-ui';
import { MessagingProvider } from '@/components/messaging-provider';

/**
 * Th6-430 — report detail. "View conversation" asks for a reason, then opens a read-only thread; every
 * read is audited server-side. Only a SUPER_ADMIN may call the endpoint behind it.
 */
export default function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params);
  return (
    <PageStack>
      <PageHeader
        title="Reported message"
        description="Review the conversation this report points at. Your access and reason are recorded."
      />
      <MessagingProvider>
        <ReportedConversationView reportId={reportId} />
      </MessagingProvider>
    </PageStack>
  );
}
