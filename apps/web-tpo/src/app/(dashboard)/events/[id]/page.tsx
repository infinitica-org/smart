import { EventDetail } from '../../../../components/campus/EventDetail';

export const metadata = { title: 'Event · SMART TPO' };

/** UNI-05 (Th6-449) — one event: publish, edit, cancel, registrants. */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetail eventId={id} />;
}
