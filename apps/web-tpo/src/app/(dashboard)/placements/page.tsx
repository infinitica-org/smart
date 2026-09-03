'use client';

import Link from 'next/link';
import { Card, Button } from '@smart/ui';
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

// Mock data for UI demonstration
const incomingJds = [
  {
    id: 'jd-1',
    role: 'Frontend Engineer',
    company: 'Acme Corp',
    location: 'Remote',
    type: 'Full-time',
    status: 'NEW', // NEW | MATCHING | SHORTLISTING | SENT
    date: '2 hours ago',
    matchCount: 14,
    skills: ['React', 'TypeScript', 'Next.js'],
  },
  {
    id: 'jd-2',
    role: 'Data Scientist',
    company: 'Globex Inc',
    location: 'New York, NY',
    type: 'Internship',
    status: 'SHORTLISTING',
    date: '1 day ago',
    matchCount: 8,
    skills: ['Python', 'SQL', 'Machine Learning'],
  },
  {
    id: 'jd-3',
    role: 'Product Designer',
    company: 'Stark Industries',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'SENT',
    date: '3 days ago',
    matchCount: 5,
    skills: ['Figma', 'UI/UX', 'Prototyping'],
  },
];

export default function PlacementsPage() {
  return (
    <main className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">JD Inbox</h2>
          <p className="text-gray-400 text-sm mt-1">
            Review incoming Job Descriptions from partner companies and match your candidates.
          </p>
        </div>
      </div>

      <Card className="bg-[#131313] border-white/5 p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search roles or companies..."
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>
        <div className="flex gap-4">
          <select className="bg-[#1a1a1a] text-gray-300 text-sm rounded-lg border border-white/5 px-4 focus:outline-none focus:border-[#00fad0]/50">
            <option value="">All Statuses</option>
            <option value="NEW">New (Unread)</option>
            <option value="SHORTLISTING">Shortlisting</option>
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

      <div className="grid grid-cols-1 gap-4">
        {incomingJds.map((jd) => (
          <Link key={jd.id} href={`/placements/${jd.id}`}>
            <Card className="bg-[#131313] border-white/5 p-5 hover:border-white/20 transition-all hover:bg-white/[0.02] cursor-pointer group relative overflow-hidden">
              {jd.status === 'NEW' && (
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                  <div className="absolute top-4 -right-6 w-24 bg-[#00fad0] text-white text-[10px] font-bold py-1 text-center rotate-45 transform">
                    NEW
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#00fad0]/10 group-hover:text-[#00fad0] transition-colors">
                    <Briefcase className="w-6 h-6 text-gray-400 group-hover:text-[#00fad0]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-[#00fad0] transition-colors">
                      {jd.role}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> {jd.company}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {jd.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {jd.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-white">{jd.matchCount} Matches</div>
                    <div className="text-xs text-gray-500">{jd.date}</div>
                  </div>

                  {jd.status === 'SHORTLISTING' && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      Shortlisting
                    </span>
                  )}
                  {jd.status === 'SENT' && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                    </span>
                  )}

                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                {jd.skills.map((skill) => (
                  <span key={skill} className="bg-white/5 text-gray-300 px-2 py-1 rounded text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
