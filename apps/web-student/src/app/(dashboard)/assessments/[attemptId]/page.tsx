'use client';

import { useParams } from 'next/navigation';
import { L1McqPlayer } from '@/components/assessment/l1-mcq-player';

export default function L1McqAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;

  if (!attemptId) {
    return <p className="text-sm text-white/50">Missing attempt id.</p>;
  }

  return <L1McqPlayer attemptId={attemptId} />;
}
