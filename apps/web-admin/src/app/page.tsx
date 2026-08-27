import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<{ accessToken?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.accessToken;
  const query = token ? `?accessToken=${encodeURIComponent(token)}` : '';
  redirect(`/admin/health${query}`);
}
