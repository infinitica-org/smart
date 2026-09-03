'use client';

import { Card, Button } from '@smart/ui';
import {
  Search,
  Filter,
  Shield,
  Clock,
  Video,
  Building2,
  ChevronRight,
  Ban,
  Zap,
} from 'lucide-react';

const mockOpportunities = [
  {
    id: 'opp-1',
    candidate: 'John Doe',
    role: 'Frontend Engineer',
    company: 'Acme Corp',
    status: 'SCORED', // AWAITING_OPT_IN, SCHEDULED, SCORED, SENT, DECLINED
    confidence: 92,
    date: 'Updated 2h ago',
  },
  {
    id: 'opp-2',
    candidate: 'Jane Smith',
    role: 'Backend Developer',
    company: 'TechFlow',
    status: 'SCHEDULED',
    date: 'Interview tomorrow 2PM',
  },
  {
    id: 'opp-3',
    candidate: 'Alex Johnson',
    role: 'Product Designer',
    company: 'Stark Industries',
    status: 'AWAITING_OPT_IN',
    date: 'Sent 3 days ago',
  },
  {
    id: 'opp-4',
    candidate: 'Sam Wilson',
    role: 'Data Engineer',
    company: 'Globex Inc',
    status: 'SENT',
    confidence: 85,
    date: 'Sent yesterday',
  },
];

export default function OpportunitiesPage() {
  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Opportunity Tracking</h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitor candidate progress through AI confidence interviews and company submissions.
          </p>
        </div>
      </div>

      <Card className="bg-[#131313] border-white/5 p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search candidate, role, or company..."
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>
        <div className="flex gap-4">
          <select className="bg-[#1a1a1a] text-gray-300 text-sm rounded-lg border border-white/5 px-4 focus:outline-none focus:border-[#00fad0]/50">
            <option value="">All Statuses</option>
            <option value="AWAITING">Awaiting Opt-In</option>
            <option value="SCHEDULED">Interview Scheduled</option>
            <option value="SCORED">Scored</option>
            <option value="SENT">Sent to Company</option>
          </select>
          <Button
            type="button"
            variant="secondary"
            className="bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>
        </div>
      </Card>

      <Card className="bg-[#131313] border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[#161616] border-b border-white/5 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Opportunity</th>
                <th className="px-6 py-4 font-medium">Pipeline Status</th>
                <th className="px-6 py-4 font-medium">AI Confidence</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockOpportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{opp.candidate}</div>
                    <div className="text-xs text-gray-500 mt-1">{opp.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-300">{opp.role}</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <Building2 className="w-3.5 h-3.5" /> {opp.company}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {opp.status === 'AWAITING_OPT_IN' && (
                      <span className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Opt-in
                      </span>
                    )}
                    {opp.status === 'SCHEDULED' && (
                      <span className="flex items-center gap-1.5 text-blue-400 text-xs font-medium">
                        <Video className="w-3.5 h-3.5" /> Scheduled
                      </span>
                    )}
                    {opp.status === 'SCORED' && (
                      <span className="flex items-center gap-1.5 text-[#00fad0] text-xs font-medium">
                        <Shield className="w-3.5 h-3.5" /> Scored (Review Pending)
                      </span>
                    )}
                    {opp.status === 'SENT' && (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <ChevronRight className="w-4 h-4 -ml-1" /> Sent to Company
                      </span>
                    )}
                    {opp.status === 'DECLINED' && (
                      <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                        <Ban className="w-3.5 h-3.5" /> Declined
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {opp.confidence ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs">
                          {opp.confidence}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-300 font-medium">High Match</span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" /> AI Assessed
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Not assessed yet</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {opp.status === 'SCORED' ? (
                      <Button
                        variant="primary"
                        className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white text-xs h-8 px-4 rounded-full"
                      >
                        Review & Send
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs h-8 px-4 rounded-full"
                      >
                        View Details
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
