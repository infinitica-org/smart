'use client';

import { useSearchParams } from 'next/navigation';
import { CandidateSuggestionsWorkspace } from '../../../components/candidate-suggestions-workspace';

export default function SuggestionsPage() {
  const searchParams = useSearchParams();
  const openingId = searchParams.get('openingId') ?? undefined;

  return <CandidateSuggestionsWorkspace initialOpeningId={openingId} />;
}
