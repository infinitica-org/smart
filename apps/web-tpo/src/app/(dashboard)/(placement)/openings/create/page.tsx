'use client';

import { useRouter } from 'next/navigation';
import { JobPostingWizard } from '@/components/job-posting/JobPostingWizard';

export default function CreateJobPostingPage() {
  const router = useRouter();

  return (
    <JobPostingWizard
      onCreated={async () => {
        router.push('/openings');
      }}
    />
  );
}
