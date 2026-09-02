'use client';

import Link from 'next/link';
import { AppShell } from '@smart/ui';
import { SkillsSection } from '../../components/profile/SkillsSection';
import { ProjectSubmissionForm } from '../../components/profile/ProjectSubmissionForm';

export default function ProfileSkillsPage() {
  return (
    <AppShell
      productName="SMART · Candidate"
      title="Profile"
      subtitle="Skills section — declare taxonomy skills and track verification."
      nav={
        <Link
          href="/dashboard"
          className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Dashboard
        </Link>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-8">
        <SkillsSection />
        <ProjectSubmissionForm />
      </div>
    </AppShell>
  );
}
