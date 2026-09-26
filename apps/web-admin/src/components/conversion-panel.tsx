'use client';

import { useState } from 'react';
import {
  ConversionMetricsCard,
  conversionRangeQuery,
  useQuery,
  useSmartApi,
  type ConversionRange,
} from '@smart/ui';

/** Th6-421 — platform-wide conversion. Needs a SmartApiProvider above it (MessagingProvider). */
export function ConversionPanel() {
  const api = useSmartApi();
  const [range, setRange] = useState<ConversionRange>('90d');
  const query = useQuery({
    queryKey: ['admin', 'conversion', range],
    queryFn: () => api.adminApplications.conversion(conversionRangeQuery(range)),
    retry: false,
  });
  return (
    <ConversionMetricsCard
      title="Platform conversion"
      description="Across every company. A rate shows once at least 5 candidates reach a stage."
      metrics={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      range={range}
      onRangeChange={setRange}
    />
  );
}
