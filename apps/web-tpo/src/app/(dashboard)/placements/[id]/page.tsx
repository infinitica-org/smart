'use client';

import Link from 'next/link';
import { Card, Button } from '@smart/ui';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Briefcase,
  Zap,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

const mockCandidates = [
  {
    id: 'c-1',
    name: 'John Doe',
    matchScore: 94,
    status: 'SHORTLISTED',
    why: 'Strong React & Node.js skills perfectly match the core requirements. Exceeds experience requirement.',
  },
  {
    id: 'c-2',
    name: 'Jane Smith',
    matchScore: 88,
    status: 'PENDING',
    why: 'Excellent frontend fundamentals. Missing some backend context but highly trainable.',
  },
  {
    id: 'c-3',
    name: 'Alex Johnson',
    matchScore: 82,
    status: 'PENDING',
    why: 'Solid project portfolio. Experience level slightly below requirement but skills are verified.',
  },
];

export default function PlacementDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex items-center gap-4 text-gray-400 text-sm">
        <Link
          href="/placements"
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Link>
        <span>/</span>
        <span className="text-white">Frontend Engineer</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
              Frontend Engineer
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Acme Corp
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Remote
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Full-time
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5"
          >
            Reject JD
          </Button>
          <Button
            variant="primary"
            className="bg-[#00fad0] hover:bg-[#00fad0]/90 text-white flex items-center gap-2"
          >
            Send Shortlist (1)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        {/* Left Column: JD Details */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Required Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {['React (Advanced)', 'TypeScript (Advanced)', 'Next.js (Intermediate)'].map((s) => (
                <span
                  key={s}
                  className="bg-white/5 border border-white/10 text-gray-300 px-3 py-1.5 rounded-lg text-sm"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Description
            </h3>
            <div className="text-gray-300 text-sm leading-relaxed space-y-4">
              <p>
                Acme Corp is looking for an experienced Frontend Engineer to join our core product
                team. You will be responsible for building highly interactive and scalable user
                interfaces using modern web technologies.
              </p>
              <p>
                The ideal candidate is deeply passionate about UX, performance, and accessible
                design. You will work closely with our backend and design teams to deliver seamless
                experiences.
              </p>
            </div>
          </div>

          <Card className="bg-[#1a1a1a] border-white/5 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Briefcase className="w-4 h-4 text-gray-500" />
              <span>Experience: 2-4 Years</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>Location: US or EU Timezones</span>
            </div>
          </Card>
        </div>

        {/* Right Column: Matched Candidates */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              AI Matched Candidates
            </h3>
            <span className="text-sm text-gray-400">14 matches found</span>
          </div>

          <div className="space-y-3">
            {mockCandidates.map((c) => (
              <Card
                key={c.id}
                className={`bg-[#131313] p-5 border ${c.status === 'SHORTLISTED' ? 'border-[#00fad0]/50' : 'border-white/5'} transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-medium shadow-inner shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium text-white">{c.name}</h4>
                        <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium border border-emerald-500/20">
                          <Zap className="w-3 h-3" />
                          {c.matchScore}% Match
                        </span>
                      </div>

                      {/* AI Explanation Panel */}
                      <div className="mt-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg text-sm text-gray-400 leading-relaxed">
                        <strong className="text-gray-300">Why this match:</strong> {c.why}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-3 mt-4 sm:mt-0 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                    {c.status === 'SHORTLISTED' ? (
                      <Button
                        variant="secondary"
                        className="bg-[#00fad0]/10 text-[#00fad0] hover:bg-[#00fad0]/20 border-transparent text-sm w-full sm:w-auto h-8 px-4 rounded-full flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Shortlisted
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/5 text-sm w-full sm:w-auto h-8 px-4 rounded-full"
                      >
                        Shortlist
                      </Button>
                    )}
                    <button className="text-xs text-gray-500 hover:text-white underline">
                      View Profile
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="pt-4 flex justify-center">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              Load more matches...
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
