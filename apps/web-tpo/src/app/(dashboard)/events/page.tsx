import { CalendarDays } from 'lucide-react';
import { EventsWorkspace } from '../../../components/campus/EventsWorkspace';
import { TpoBentoPageHeader } from '../../../components/tpo-bento/TpoBentoPageHeader';

export const metadata = { title: 'Events · SMART TPO' };

/** UNI-05 (Th6-448) — create and manage career events. */
export default function EventsPage() {
  return (
    <div className="space-y-4">
      <TpoBentoPageHeader
        icon={CalendarDays}
        title="Events"
        description="Create career events, publish them to students and approved employers, and see who registered."
      />
      <EventsWorkspace />
    </div>
  );
}
