'use client';

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  TierBadge,
  VerificationBadge,
  AiExplanationPanel,
  PipelineStageBar,
  CandidateProfileCard,
  type PipelineStage,
} from '@smart/ui';
import { HealthProbeDemo } from '../../components/health-probe-demo';

export default function DesignSystemPage() {
  const demoStages: PipelineStage[] = [
    { id: '1', label: 'Matches', status: 'complete' },
    { id: '2', label: 'Shortlist', status: 'active' },
    { id: '3', label: 'Interview', status: 'upcoming' },
    { id: '4', label: 'Offer', status: 'upcoming' },
  ];

  const demoFailedStages: PipelineStage[] = [
    { id: '1', label: 'Matches', status: 'complete' },
    { id: '2', label: 'Shortlist', status: 'complete' },
    { id: '3', label: 'Interview', status: 'failed' },
    { id: '4', label: 'Offer', status: 'upcoming' },
  ];

  const demoSkills = [
    { name: 'Python', status: 'VERIFIED' as const },
    { name: 'PyTorch', status: 'VERIFIED' as const },
    { name: 'TensorFlow', status: 'IN_PROGRESS' as const },
    { name: 'Scikit-Learn', status: 'PENDING_REVIEW' as const },
    { name: 'SQL', status: 'LOCKED' as const },
    { name: 'M LOps', status: 'EXPIRING' as const },
  ];

  const demoProjects = [
    {
      title: 'Neural Style Transfer Service',
      description: 'Distributed real-time style transformation pipeline using PyTorch & Kafka.',
      stack: ['PyTorch', 'FastAPI', 'Kafka', 'React'],
      githubUrl: 'https://github.com/example/style-transfer',
      loomUrl: 'https://loom.com/example-video-id',
    },
  ];

  return (
    <div className="p-8 space-y-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-4">SMART Design System</h1>
        <p className="text-[var(--text-muted)]">
          Testing all components and tokens, including Tailwind 4 default dark mode.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Health Probe (Typed Client)
        </h2>
        <HealthProbeDemo />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Buttons
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Badges
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <h3 className="text-lg font-medium mt-4">Tier Badges</h3>
        <div className="flex flex-wrap items-center gap-4">
          <TierBadge tier="GOLD" />
          <TierBadge tier="SILVER" />
          <TierBadge tier="BRONZE" />
          <TierBadge tier="BELOW_BRONZE" />
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <TierBadge tier="GOLD" showLabel />
          <TierBadge tier="SILVER" showLabel />
          <TierBadge tier="BRONZE" showLabel />
          <TierBadge tier="BELOW_BRONZE" showLabel />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Verification Badges
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <VerificationBadge status="VERIFIED" />
          <VerificationBadge status="IN_PROGRESS" />
          <VerificationBadge status="PENDING_REVIEW" />
          <VerificationBadge status="LOCKED" />
          <VerificationBadge status="EXPIRING" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          AI Explanation Panels
        </h2>
        <div className="space-y-4">
          <AiExplanationPanel
            explanation="The candidate demonstrates strong theoretical understanding and practical application of advanced neural networks, exceeding the threshold benchmark scores for level 3 AIML Engineer certification."
            score={87}
            tone="brand"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AiExplanationPanel
              explanation="All validation pipelines, Kafka integrations, and system tests passed cleanly."
              score={100}
              tone="success"
              title="Verification Sign-Off"
            />
            <AiExplanationPanel
              explanation="The candidate used deprecated syntax in SQL attempts. Review recommended."
              score={62}
              tone="warning"
              title="Syntax Warnings"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Pipeline Stage Bars
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">
              Interactive Mode (Selecting Shortlist)
            </h3>
            <PipelineStageBar
              stages={demoStages}
              interactive={true}
              onStageSelect={(id) => alert(`Selected Stage: ${id}`)}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">
              Non-Interactive Failed Case
            </h3>
            <PipelineStageBar stages={demoFailedStages} interactive={false} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Candidate Profile Card (Presentational Shell)
        </h2>
        <div className="max-w-2xl">
          <CandidateProfileCard
            candidateId="student-demo-uuid"
            displayName="Alex Mercer (Demo Profile)"
            trackName="AIML Engineer"
            headlineTier="GOLD"
            skills={demoSkills}
            academicDetails={{
              batchName: '2026-AIML-A',
              graduationYear: 2026,
              gpa: '9.4',
            }}
            contactInfo={{
              email: 'alex.mercer@demo.smart.io',
              phone: '+91 98765 43210',
              linkedIn: 'https://linkedin.com/in/alex-mercer-demo',
              github: 'https://github.com/alex-mercer-demo',
            }}
            aiExplanation={{
              summary:
                'Highly recommended. Alex shows deep competence in AI/ML model deployment and distributed processing pipelines.',
              score: 91,
              tone: 'brand',
            }}
            projects={demoProjects}
            actions={
              <div className="flex gap-2">
                <Button variant="primary">Shortlist Candidate</Button>
                <Button variant="outline">View Full Dossier</Button>
              </div>
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2">
          Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>This is a description for the card component.</CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <p className="text-sm text-[var(--text-muted)]">
                Cards form the primary content boundaries in the application.
              </p>
            </div>
          </Card>

          <Card className="bg-[var(--surface-muted)]">
            <CardHeader>
              <CardTitle>Muted Card</CardTitle>
              <CardDescription>Using the surface-muted token.</CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <Button variant="outline" fullWidth>
                Action
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
