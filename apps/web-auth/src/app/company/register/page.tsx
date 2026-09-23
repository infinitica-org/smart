import type { Metadata } from 'next';
import { CompanyRegisterWizard } from './company-register-wizard';

export const metadata: Metadata = {
  title: 'Register company · SMART',
  description: 'Self-serve company registration for the SMART B2B portal.',
};

export default function CompanyRegisterPage() {
  return <CompanyRegisterWizard />;
}
