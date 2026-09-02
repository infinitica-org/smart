import { Suspense } from 'react';
import ActivateClient from './ActivateClient';
import { Loader2 } from 'lucide-react';

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ActivateClient />
    </Suspense>
  );
}
