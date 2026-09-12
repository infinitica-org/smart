'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Old profile deep-link — same player now lives under Assessments. */
export default function SkillVerifyRedirectPage() {
  const params = useParams<{ claimId: string }>();
  const router = useRouter();
  useEffect(() => {
    if (params.claimId) {
      router.replace(`/assessments/skills/${params.claimId}`);
    }
  }, [params.claimId, router]);
  return <p className="text-sm text-muted-foreground">Opening skill verification…</p>;
}
