import { EventDetailView } from '@/components/events/EventDetailView';

export const metadata = { title: 'Event · SMART' };

/** UNI-05 (Th6-451) — one event with its date in the event's own timezone. */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl pb-12">
      <EventDetailView eventId={id} />
    </div>
  );
}
