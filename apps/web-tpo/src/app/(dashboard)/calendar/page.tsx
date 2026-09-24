import type { Metadata } from 'next';
import { PlacementCalendarWorkspace } from '../../../components/placement-calendar-workspace';

export const metadata: Metadata = {
  title: 'Placement Calendar',
  description: 'Track upcoming placement drives, application deadlines, and interviews.',
};

export default function CalendarPage() {
  return <PlacementCalendarWorkspace />;
}
