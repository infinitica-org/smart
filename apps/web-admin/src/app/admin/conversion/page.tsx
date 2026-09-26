'use client';

import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PageStack } from '@/components/admin-ui';
import { ConversionPanel } from '@/components/conversion-panel';
import { MessagingProvider } from '@/components/messaging-provider';

/** Th6-421 — hiring conversion across the platform (super-admin only, like the endpoint). */
export default function ConversionPage() {
  return (
    <PageStack>
      <PageHeader
        icon={TrendingUp}
        tone="inverse"
        title="Hiring conversion"
        description="How many shortlisted candidates reach an interview, and how many interviewed candidates are hired."
      />
      <MessagingProvider>
        <ConversionPanel />
      </MessagingProvider>
    </PageStack>
  );
}
