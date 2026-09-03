import { Gauge } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import { PageStack } from '@/components/admin-ui';

export default function Page() {
  return (
    <PageStack>
      <PageHeader
        icon={Gauge}
        title="Rate limit controls"
        description="API throttle policy overrides. This console is a placeholder until override APIs ship."
      />
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Realtime Redis API limit adjustments for critical pathways will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageStack>
  );
}
