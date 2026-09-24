import type { Metadata } from 'next';
import { WhitelistWorkspace } from '../../../components/whitelist/WhitelistWorkspace';

export const metadata: Metadata = {
  title: 'Whitelist Candidates',
  description: 'Provision candidate access and manage institution whitelists.',
};

export default function WhitelistPage() {
  return <WhitelistWorkspace />;
}
