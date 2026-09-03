import type { Metadata } from 'next';
import { InstitutionLogin } from '../../components/institution-login';

export const metadata: Metadata = {
  title: 'Institution Login · SMART',
  description: 'Sign in to the SMART TPO console.',
};

export default function LoginPage() {
  return <InstitutionLogin />;
}
