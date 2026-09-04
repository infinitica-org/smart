'use client';

import Link from 'next/link';
import { Card, Button } from '@smart/ui';
import { ArrowLeft, Building2, MapPin, Clock, Briefcase, Zap, CheckCircle2 } from 'lucide-react';

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

export default function PlacementDetailPage() {
  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
        <Link
          href="/placements"
          className="hover:text-[#004c63] transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Frontend Engineer</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-[#004c63]/10 border border-[#004c63]/20 rounded-2xl flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 text-[#004c63]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              Frontend Engineer
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" /> Acme Corp
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" /> Remote
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" /> Full-time
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 font-medium rounded-xl"
          >
            Reject JD
          </Button>
          <Button
            variant="primary"
            className="bg-[#004c63] hover:bg-[#003a4d] text-white flex items-center gap-2 font-semibold shadow-sm rounded-xl px-4 py-2"
          >
            Send Shortlist (1)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        {/* Left Column: JD Details */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Required Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {['React (Advanced)', 'TypeScript (Advanced)', 'Next.js (Intermediate)'].map((s) => (
                <span
                  key={s}
                  className="bg-slate-100 border border-slate-200 text-slate-800 font-mono font-medium px-3 py-1.5 rounded-lg text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Description
            </h3>
            <div className="text-slate-600 text-sm leading-relaxed space-y-4 font-normal">
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

          <Card className="bg-slate-50/70 border-slate-200 p-4 flex flex-col gap-3 rounded-xl">
            <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span>Experience: 2-4 Years</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Location: US or EU Timezones</span>
            </div>
          </Card>
        </div>

        {/* Right Column: Matched Candidates */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              AI Matched Candidates
            </h3>
            <span className="text-sm font-medium text-slate-500">14 matches found</span>
          </div>

          <div className="space-y-3">
            {mockCandidates.map((c) => (
              <Card
                key={c.id}
                className={`bg-white p-5 border ${c.status === 'SHORTLISTED' ? 'border-[#004c63] ring-1 ring-[#004c63]/20' : 'border-slate-200'} shadow-sm rounded-xl transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#004c63]/10 border border-[#004c63]/20 flex items-center justify-center text-[#004c63] font-bold text-sm shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-slate-900">{c.name}</h4>
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold border border-emerald-200">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          {c.matchScore}% Match
                        </span>
                      </div>

                      {/* AI Explanation Panel */}
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 leading-relaxed">
                        <strong className="text-slate-900 font-semibold">Why this match:</strong>{' '}
                        {c.why}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-3 mt-4 sm:mt-0 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                    {c.status === 'SHORTLISTED' ? (
                      <Button
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-sm w-full sm:w-auto h-8 px-4 rounded-full flex items-center gap-1.5 font-semibold"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Shortlisted
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 text-sm w-full sm:w-auto h-8 px-4 rounded-full font-medium"
                      >
                        Shortlist
                      </Button>
                    )}
                    <button className="text-xs text-slate-500 hover:text-[#004c63] underline font-medium">
                      View Profile
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="pt-4 flex justify-center">
            <Button variant="ghost" className="text-slate-500 hover:text-slate-900 font-medium">
              Load more matches...
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
