'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ConversionMetricsCard, conversionRangeQuery, type ConversionRange } from '@smart/ui';
import { api } from '@/lib/api';

/**
 * Th6-421 — conversion for one job (pass `jobId`) or for the whole company. The server scopes it to
 * the caller's company and withholds any rate under five candidates.
 */
export function ConversionCard({ jobId, title }: { jobId?: string; title?: string }) {
  const [range, setRange] = useState<ConversionRange>('90d');
  const query = useQuery({
    queryKey: ['employer', 'conversion', jobId ?? 'company', range],
    queryFn: () => api.employer.conversion(jobId, conversionRangeQuery(range)),
    retry: false,
  });
  return (
    <ConversionMetricsCard
      title={title}
      metrics={query.data}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      range={range}
      onRangeChange={setRange}
    />
  );
}
