'use client';

import { Briefcase } from 'lucide-react';
import { WorkExperienceVerificationWorkspace } from '../../../components/work-experience-verification-workspace';

export default function WorkExperienceVerificationPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#004C63]">
            <Briefcase className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Work Experience Verification</h1>
            <p className="text-sm text-slate-500">
              Track candidate claims, employer responses, reminders, and next actions.
            </p>
          </div>
        </div>
      </div>
      <WorkExperienceVerificationWorkspace />
    </div>
  );
}
