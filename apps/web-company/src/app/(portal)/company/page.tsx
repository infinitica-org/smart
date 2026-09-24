'use client';

import { useEffect, useState } from 'react';
import { Building2, Pencil, Globe, MapPin, ShieldCheck, Mail, Check } from 'lucide-react';
import { useCompanyAccount } from '@/lib/use-company-account';
import { buildAboutDraft } from '../../../lib/about-template';
import { LocationInput } from '../../../components/location-input';
import { Modal, PageHeader } from '../../../components/ui';
import {
  card,
  input,
  label,
  pageStack,
  primaryButton,
  secondaryButton,
  textarea,
} from '../../../lib/ui';

export default function CompanyProfilePage() {
  const { data: account } = useCompanyAccount();

  const [company, setCompany] = useState<{
    name: string;
    email: string;
    domain?: string;
    industry?: string;
    size?: string;
    location?: string;
    website?: string;
    about?: string;
  }>({
    name: 'SMART Pilot Employer',
    email: 'company@smart.local',
    industry: 'Software & Technology',
    size: '100–500 employees',
    location: 'Bengaluru, India · Remote',
    website: 'https://smart.local',
    about:
      'We are an innovative engineering company hiring verified graduates and student talent based on proctored SMART competency credentials.',
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(company);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (account) {
      setCompany((prev) => ({
        ...prev,
        name: account.companyName || prev.name,
        email: account.email || prev.email,
        industry: account.companyIndustry || prev.industry,
        location: account.companyLocation || prev.location,
        website: account.companyWebsite || prev.website,
      }));
      setEditForm((prev) => ({
        ...prev,
        name: account.companyName || prev.name,
        email: account.email || prev.email,
        industry: account.companyIndustry || prev.industry,
        location: account.companyLocation || prev.location,
        website: account.companyWebsite || prev.website,
      }));
    }
  }, [account]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setCompany(editForm);
    setSaved(true);
    setEditOpen(false);
    setTimeout(() => setSaved(false), 4000);
  }

  return (
    <div className={pageStack}>
      <PageHeader
        title="Company Profile"
        description="Public employer brand, verified credentials, and organizational presence."
        actions={
          <button
            type="button"
            onClick={() => {
              setEditForm(company);
              setEditOpen(true);
            }}
            className={primaryButton}
          >
            <Pencil className="size-3.5" aria-hidden /> Edit Profile
          </button>
        }
      />

      {saved ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 animate-fadeIn">
          <Check className="size-4 text-emerald-600" />
          Company profile details updated successfully.
        </div>
      ) : null}

      <section className={`${card} !p-0 overflow-hidden bg-white`}>
        {/* Ambient Dark/Emerald Pattern Banner */}
        <div
          aria-hidden
          className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-emerald-950"
        >
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent" />
        </div>

        {/* Profile Header Body */}
        <div className="px-6 pb-6 pt-0 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Overlapping Logo */}
              <div className="-mt-10 shrink-0">
                <span className="flex size-20 items-center justify-center rounded-2xl border-4 border-white bg-zinc-950 text-white shadow-md ring-1 ring-zinc-200/50">
                  <Building2 className="size-9 text-emerald-400" aria-hidden />
                </span>
              </div>

              {/* Title & Status Pills */}
              <div className="pt-1 sm:pt-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-950">
                    {company.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    Verified Employer
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {company.industry} · {company.size} · {company.location}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditForm(company);
                setEditOpen(true);
              }}
              className={`${secondaryButton} shrink-0`}
            >
              <Pencil className="size-3.5" /> Edit Details
            </button>
          </div>
        </div>

        {/* Details & Metadata Grid */}
        <div className="border-t border-zinc-100 px-6 py-6 md:px-8 space-y-6 bg-white">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              About Organization
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">{company.about}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4 border-t border-zinc-100 text-xs">
            <div className="flex items-center gap-3 text-zinc-600 rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3.5 shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-600 shrink-0">
                <Mail className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-bold text-zinc-400">
                  Work Email
                </span>
                <span className="font-semibold text-zinc-900 truncate block">{company.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-600 rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3.5 shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-600 shrink-0">
                <Globe className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-bold text-zinc-400">
                  Website URL
                </span>
                <a
                  href={
                    company.website?.startsWith('http')
                      ? company.website
                      : `https://${company.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-zinc-900 hover:text-emerald-700 hover:underline truncate block"
                >
                  {company.website}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-600 rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3.5 shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white border border-zinc-200/80 text-zinc-600 shrink-0">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] uppercase font-bold text-zinc-400">
                  Location / Mode
                </span>
                <span className="font-semibold text-zinc-900 truncate block">
                  {company.location}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Company Profile Modal */}
      <Modal open={editOpen} title="Edit Company Profile" onClose={() => setEditOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={label}>Company Name</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className={input}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Industry</label>
              <input
                type="text"
                value={editForm.industry}
                onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Company Size</label>
              <select
                value={editForm.size}
                onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                className={input}
              >
                <option value="1–50 employees">1–50 employees</option>
                <option value="50–100 employees">50–100 employees</option>
                <option value="100–500 employees">100–500 employees</option>
                <option value="500–2,000 employees">500–2,000 employees</option>
                <option value="2,000+ employees">2,000+ employees</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Location / Headquarters</label>
              <LocationInput
                value={editForm.location ?? ''}
                onChange={(next) => setEditForm({ ...editForm, location: next })}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Website URL</label>
              <input
                type="text"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                className={input}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className={label}>About Organization</label>
              <button
                type="button"
                className="text-xs font-semibold text-blue-700 hover:underline"
                onClick={() => setEditForm({ ...editForm, about: buildAboutDraft(editForm) })}
              >
                Draft from my details
              </button>
            </div>
            <textarea
              rows={4}
              value={editForm.about}
              onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
              className={textarea}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" className={primaryButton}>
              Save Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
