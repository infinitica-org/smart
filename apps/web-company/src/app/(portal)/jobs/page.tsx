import { ComingSoonPanel } from '@/components/coming-soon-panel';

export default function CompanyJobsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Jobs</h1>
      <ComingSoonPanel
        title="Job posting is coming soon"
        description="You will be able to create and manage job openings from this workspace after the recruitment module ships."
      />
    </div>
  );
}
