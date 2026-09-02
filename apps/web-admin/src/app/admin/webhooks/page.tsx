import { Webhook } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import { PageStack } from '@/components/admin-ui';

export default function Page() {
  return (
    <PageStack>
      <PageHeader
        icon={Webhook}
        title="Webhook integrations"
        description="Outbound CRM integration targets. This console is a placeholder until the webhook APIs ship."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Outbound HMAC-SHA256 partner ERP registrations will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageStack>
  );
}
