'use client';

import { useParams } from 'next/navigation';
import { SkillVerifyPlayer } from '@/components/assessment/skill-verify-player';

export default function SkillVerifyAssessmentPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;
  if (!claimId) {
    return <p className="text-sm text-white/50">Missing claim.</p>;
  }
  return <SkillVerifyPlayer claimId={claimId} />;
}
