import { redirect } from 'next/navigation';

/** No standalone landing page — every visitor lands on the status page, which
 * itself redirects to /login when there's no session. */
export default function RootPage() {
  redirect('/status');
}
