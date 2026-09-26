import { redirect } from 'next/navigation';

/** UNI-05 — "Campus access" lands on the review queue. */
export default function CampusIndexPage() {
  redirect('/campus/requests');
}
