import { redirect } from 'next/navigation';

/** Notification links point at /events/:id; employers manage registration from the list. */
export default function EventRedirectPage() {
  redirect('/events');
}
