import { redirect } from 'next/navigation';

/** No standalone landing page — every visitor lands on the dashboard, which
 * itself redirects to /login when there's no session. */
export default function RootPage() {
  redirect('/dashboard');
}
