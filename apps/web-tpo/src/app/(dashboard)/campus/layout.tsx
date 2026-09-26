import type { ReactNode } from 'react';
import { Handshake } from 'lucide-react';
import { CampusTabs } from '../../../components/campus/CampusTabs';
import { TpoBentoPageHeader } from '../../../components/tpo-bento/TpoBentoPageHeader';

/** UNI-05 (Th6-445/446/447) — employer campus access: the review queue and the approved-employers list. */
export default function CampusLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <TpoBentoPageHeader
        icon={Handshake}
        title="Campus access"
        description="Review employers asking to recruit on your campus and see who is recruiting from your students."
      />
      <CampusTabs />
      {children}
    </div>
  );
}
