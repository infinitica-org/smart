'use client';

import { useState } from 'react';
import { Card, Button } from '@smart/ui';
import { Download, FileText, Calendar, Filter, Loader2, CheckCircle2 } from 'lucide-react';

const mockReports = [
  {
    id: '1',
    name: 'Placement Compliance Report (Q3)',
    date: 'Oct 1, 2026',
    format: 'PDF',
    status: 'READY',
  },
  {
    id: '2',
    name: 'Batch Readiness Snapshot - CS-2024',
    date: 'Sep 15, 2026',
    format: 'Excel',
    status: 'READY',
  },
  {
    id: '3',
    name: 'Annual Accreditation Export',
    date: 'Just now',
    format: 'CSV',
    status: 'GENERATING',
  },
];

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <main className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Reports & Compliance</h2>
          <p className="text-gray-400 text-sm mt-1">
            Generate placement evidence and readiness exports for accreditation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Builder */}
        <div className="lg:col-span-1">
          <Card className="bg-[#131313] border-white/5 p-5 sticky top-24">
            <h3 className="text-lg font-medium text-white mb-1">Report Builder</h3>
            <p className="text-sm text-gray-400 mb-6">Configure and export a new report.</p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Report Type
                </label>
                <select className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 px-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all">
                  <option>Placement Compliance</option>
                  <option>Batch Readiness Snapshot</option>
                  <option>Skill Gap Analysis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Date Range</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Last 90 Days"
                    className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 pl-10 pr-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Batch Filter (Optional)
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg py-2 pl-10 pr-3 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 transition-all">
                    <option>All Batches</option>
                    <option>CS-2024</option>
                    <option>IT-2025</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Export Format
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="radio" name="format" defaultChecked className="accent-[#00fad0]" />{' '}
                    PDF
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="radio" name="format" className="accent-[#00fad0]" /> Excel
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="radio" name="format" className="accent-[#00fad0]" /> CSV
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isGenerating}
                className="w-full bg-[#00fad0] hover:bg-[#00fad0]/90 text-white mt-4"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Generate Report'
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2">
          <Card className="bg-[#131313] border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h3 className="text-lg font-medium text-white">Recent Exports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-[#161616] border-b border-white/5 text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Report Name</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockReports.map((report) => (
                    <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-gray-400" />
                          </div>
                          <span className="font-medium text-white">{report.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{report.date}</td>
                      <td className="px-6 py-4">
                        {report.status === 'READY' ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant={report.status === 'READY' ? 'secondary' : 'outline'}
                          disabled={report.status !== 'READY'}
                          className={
                            report.status === 'READY'
                              ? 'bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5'
                              : 'border-white/5 text-gray-500'
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download {report.format}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
