import { Suspense } from 'react';
import { Users } from 'lucide-react';
import { StudentReadinessRoster } from '../../../../../components/readiness/StudentReadinessRoster';
import { TpoBentoPageHeader } from '../../../../../components/tpo-bento/TpoBentoPageHeader';

export const metadata = { title: 'Student readiness · SMART TPO' };

/** UNI-04 (Th6-437/438/439) — the student readiness roster. */
export default function StudentReadinessPage() {
  return (
    <div className="space-y-4">
      <TpoBentoPageHeader
        icon={Users}
        title="Student readiness"
        description="Filter students by verification status, program and graduation year, and see who needs help."
      />
      {/* useSearchParams needs a Suspense boundary for static rendering. */}
      <Suspense fallback={null}>
        <StudentReadinessRoster />
      </Suspense>
    </div>
  );
}
