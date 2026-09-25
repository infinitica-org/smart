import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isSmartApiError } from '@smart/api-client';
import { ErrorState } from '@smart/ui';
import { CompanyPublicView } from '../../../components/company-public-view';
import { api } from '../../../lib/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadCompany(slug: string) {
  try {
    return { profile: await api.companies.getPublic(slug) };
  } catch (error) {
    // Unverified, held, deactivated and unknown companies all answer 404: there is no public page.
    if (isSmartApiError(error) && error.statusCode === 404) notFound();
    return { profile: null };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { profile } = await loadCompany(slug);
  return { title: profile ? `${profile.displayName} · SMART` : 'Company · SMART' };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const { profile } = await loadCompany(slug);
  if (!profile) {
    return (
      <ErrorState
        title="Company unavailable"
        message="We could not load this company right now. Please try again shortly."
      />
    );
  }
  return <CompanyPublicView profile={profile} />;
}
