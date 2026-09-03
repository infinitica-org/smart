'use client';

import { Alert, Button } from '@smart/ui';

export function FullscreenGate({ blocked, onResume }: { blocked: boolean; onResume: () => void }) {
  if (!blocked) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6">
      <Alert tone="warning" title="Fullscreen required" className="max-w-md">
        <p className="mb-4">Return to fullscreen to continue the assessment.</p>
        <Button type="button" onClick={onResume}>
          Return to fullscreen
        </Button>
      </Alert>
    </div>
  );
}
