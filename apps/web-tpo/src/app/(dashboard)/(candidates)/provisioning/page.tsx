import { redirect } from 'next/navigation';

/** Legacy URL — whitelist and candidate upload at `/whitelist`. */
export default function ProvisioningRedirectPage() {
  redirect('/whitelist');
}
