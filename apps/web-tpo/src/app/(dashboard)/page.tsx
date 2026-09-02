'use client';

import {
  Users,
  CheckCircle,
  TrendingUp,
  Inbox,
  Briefcase,
  Award,
  Activity,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  KpiCard,
  FunnelPipeline,
  ReadinessOverview,
  ProgressList,
  type FunnelStep,
  type RingLegendItem,
} from '@smart/ui';

export default function DashboardPage() {
  const pipelineSteps: FunnelStep[] = [
    { id: '1', label: 'New Matches', value: 342, icon: Inbox },
    { id: '2', label: 'Shortlisted', value: 128, icon: FileText },
    { id: '3', label: 'Interviewing', value: 45, icon: Activity },
    { id: '4', label: 'Offered', value: 12, icon: Briefcase },
    { id: '5', label: 'Hired', value: 8, icon: Award, shine: true },
  ];

  const readinessLegend: RingLegendItem[] = [
    { id: 'verified', label: 'Ready', value: 420, color: 'var(--color-success)' },
    { id: 'pending', label: 'Pending', value: 150, color: 'var(--color-warning)' },
    { id: 'locked', label: 'Needs Support', value: 30, color: 'var(--color-danger)' },
  ];

  const skillGaps = [
    { id: '1', label: 'System Design', value: 85, max: 100 },
    { id: '2', label: 'React / Next.js', value: 62, max: 100 },
    { id: '3', label: 'Data Structures', value: 45, max: 100 },
    { id: '4', label: 'Cloud Architecture', value: 20, max: 100 },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Daily Operational View
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitor candidate readiness and placement activity across your institution.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#131313] p-1 rounded-full border border-white/5">
          <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:text-white">
            All time
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-full shadow-sm bg-[#00fad0] hover:bg-[#00fad0]/90 text-black font-medium"
          >
            Weekly
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Candidates" value={1250} icon={Users} trend="+12% from last month" />
        <KpiCard
          label="Verified Skills"
          value={845}
          icon={CheckCircle}
          accent
          hint="Across all active cohorts"
        />
        <KpiCard
          label="Active Placements"
          value={64}
          icon={TrendingUp}
          trend="+5% from last week"
        />
        <KpiCard label="Needs Attention" value={12} icon={AlertCircle} trend="Candidates flagged" />
      </div>

      {/* Row 2: Pipeline */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="bg-[#131313] border-white/5 overflow-hidden">
          <div className="p-5">
            <FunnelPipeline title="Placement Pipeline" steps={pipelineSteps} />
          </div>
        </Card>
      </div>

      {/* Row 3: Readiness & Skill Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#131313] border-white/5 overflow-hidden p-5 flex flex-col justify-center">
          <ReadinessOverview
            title="Batch Readiness"
            percent={65}
            centerLabel="Ready"
            legend={readinessLegend}
          />
        </Card>

        <Card className="bg-[#131313] border-white/5 overflow-hidden p-5">
          <ProgressList
            title="Skill Gap Analysis"
            items={skillGaps}
            action={
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white hover:bg-white/5"
              >
                View details
              </Button>
            }
          />
        </Card>
      </div>
    </div>
  );
}
