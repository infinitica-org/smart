'use client';

import { useSmartApi, useQuery } from '@smart/ui';

export function HealthProbeDemo() {
  const api = useSmartApi();

  const { data, isLoading, error } = useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => api.system.health(),
  });

  if (isLoading) {
    return <div className="text-gray-400">Pinging API health endpoint...</div>;
  }

  if (error) {
    return <div className="text-red-500">Failed to connect to API</div>;
  }

  return (
    <div className="rounded border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-2 text-lg font-medium text-gray-200">API Health Probe</h3>
      <pre className="text-sm text-green-400">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
