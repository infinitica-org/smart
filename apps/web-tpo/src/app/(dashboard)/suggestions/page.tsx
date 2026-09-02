'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CandidateSuggestionsWorkspace } from '../../../components/candidate-suggestions-workspace';

function SuggestionsPageContent() {
  const searchParams = useSearchParams();
  const openingId = searchParams.get('openingId') ?? undefined;

  return <CandidateSuggestionsWorkspace initialOpeningId={openingId} />;
}

export default function SuggestionsPage() {
  return (
    <Suspense fallback={null}>
      <SuggestionsPageContent />
    </Suspense>
  );
}
