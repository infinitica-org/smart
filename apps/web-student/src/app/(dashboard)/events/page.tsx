import { EventsList } from '@/components/events/EventsList';

export const metadata = { title: 'Events · SMART' };

/** UNI-05 (Th6-451) — career events from the student's own university. */
export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-12">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Events</h1>
        <p className="text-sm text-zinc-600">
          Career events your university has published. Register to save your seat.
        </p>
      </header>
      <EventsList />
    </div>
  );
}
