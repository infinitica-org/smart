'use client';

import { useEffect, useState } from 'react';
import { Building2, Pencil, Globe, MapPin, ShieldCheck, Mail } from 'lucide-react';
import { getCurrentUser } from '../../../lib/auth';
import { card, pageStack, secondaryButton } from '../../../lib/ui';

export default function CompanyProfilePage() {
  const [company, setCompany] = useState<{
    name: string;
    email: string;
    domain?: string;
    industry?: string;
    size?: string;
    location?: string;
    about?: string;
  }>({
    name: 'Employer Account',
    email: 'recruiter@company.com',
    industry: 'Software & Technology',
    size: '100–500 employees',
    location: 'United States · Remote',
    about: 'Verified corporate recruiting profile on SMART platform.',
  });

  useEffect(() => {
    getCurrentUser()
      .then((me) => {
        if (me?.email) {
          const domain = me.email.split('@')[1] ?? 'company.com';
          const rawName = domain.split('.')[0] || 'Employer';
          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          setCompany((prev) => ({
            ...prev,
            name,
            email: me.email,
            domain,
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className={pageStack}>
      <section className={`${card} !p-0`}>
        <div
          aria-hidden
          className="h-36 w-full bg-gradient-to-br from-zinc-100 via-zinc-50 to-emerald-50 border-b border-zinc-100"
        />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-6 md:px-6">
          <div className="-mt-9 flex items-end gap-4">
            <span className="flex size-[72px] shrink-0 items-center justify-center rounded-xl border-4 border-white bg-zinc-900 text-white shadow-md">
              <Building2 className="size-7" aria-hidden />
            </span>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-900">
                  {company.name}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  Verified Employer
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {company.industry} · {company.size}
              </p>
            </div>
          </div>
          <button type="button" className={`${secondaryButton} mt-4`}>
            <Pencil className="size-3.5" aria-hidden /> Edit Details
          </button>
        </div>

        <div className="border-t border-zinc-100 px-5 py-5 md:px-6 space-y-4">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              About Organization
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-600">{company.about}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-zinc-100 text-xs">
            <div className="flex items-center gap-2 text-zinc-600">
              <Mail className="size-4 text-zinc-400" />
              <span>{company.email}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <Globe className="size-4 text-zinc-400" />
              <span>{company.domain ?? 'company.com'}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <MapPin className="size-4 text-zinc-400" />
              <span>{company.location}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
