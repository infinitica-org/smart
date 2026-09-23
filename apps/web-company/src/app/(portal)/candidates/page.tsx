import { ComingSoonPanel } from '@/components/coming-soon-panel';

export default function CompanyCandidatesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Candidates</h1>
      <ComingSoonPanel
        title="Candidate discovery is coming soon"
        description="SMART will surface matched candidates here when company sourcing workflows are enabled."
      />
    </div>
  );
}
