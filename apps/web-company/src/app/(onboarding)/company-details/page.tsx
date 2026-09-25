'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CompleteCompanyDetailsPage() {
  const [companyName, setCompanyName] = useState('drangon');
  const [isDifferentLegalName, setIsDifferentLegalName] = useState(false);
  const [legalCompanyName, setLegalCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('http://');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [companyType, setCompanyType] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);

  const sizeOptions = [
    '1 - 10',
    '10 - 50',
    '50 - 100',
    '100 - 250',
    '250 - 1,000',
    '1,000 - 5,000',
    '5,000 - 10,000',
    '10,000 - 25,000',
    '25,000+',
  ];

  const typeOptions = ['Public', 'Private', 'Government'];

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoName(file.name);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-[2.25rem]">
        Complete company details
      </h1>
      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[#4b5563]">
        73% of candidates are more likely to apply after seeing behind-the-scenes employer details.
        These details will show up on your company brand page.
      </p>

      <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Company Name */}
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium text-[#111827]">
            Company name
          </label>
          <div className="mt-2">
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="h-12 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9ca3af] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            <input
              id="different-legal-name"
              type="checkbox"
              checked={isDifferentLegalName}
              onChange={(e) => setIsDifferentLegalName(e.target.checked)}
              className="h-4 w-4 rounded border-[#d1d5db] text-black focus:ring-black"
            />
            <label htmlFor="different-legal-name" className="text-xs font-medium text-[#374151]">
              My legal company name is different from company name.
            </label>
          </div>

          {isDifferentLegalName ? (
            <div className="mt-3">
              <label htmlFor="legal-name" className="block text-xs font-medium text-[#374151]">
                Legal company name
              </label>
              <input
                id="legal-name"
                type="text"
                value={legalCompanyName}
                onChange={(e) => setLegalCompanyName(e.target.value)}
                placeholder="Official registered company name"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827] focus:border-black focus:outline-none"
              />
            </div>
          ) : null}
        </div>

        {/* Company Logo */}
        <div>
          <label className="block text-sm font-medium text-[#111827]">
            Company logo (optional)
          </label>
          <div className="mt-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-neutral-100 hover:border-neutral-300">
              <span>{logoName ? `Uploaded: ${logoName}` : 'Upload logo'}</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
            </label>
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">
            This is used as the main thumbnail image associated with your company.
          </p>
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-[#111827]">
            Industry
          </label>
          <div className="relative mt-2">
            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder=""
              className="h-12 w-full rounded-xl border border-[#e5e7eb] bg-white pl-4 pr-11 text-sm text-[#111827] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <svg
              className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-[#111827]">
            Website
          </label>
          <div className="mt-2">
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="h-12 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[#111827]">
            Description
          </label>
          <div className="mt-2">
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] bg-white p-3.5 text-sm text-[#111827] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-[#111827]">
            Address
          </label>
          <div className="relative mt-2">
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder=""
              className="h-12 w-full rounded-xl border border-[#e5e7eb] bg-white pl-4 pr-11 text-sm text-[#111827] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <svg
              className="absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">
            Enter full address or city/country. Entering full address will accelerate the
            verification process.
          </p>
        </div>

        {/* Public phone number (optional) */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[#111827]">
            Public phone number (optional)
          </label>
          <div className="mt-2">
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">
            This is used by our partner institutions for further verification.
          </p>
        </div>

        {/* Public company email (optional) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#111827]">
            Public company email (optional)
          </label>
          <div className="mt-2">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827] transition focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <p className="mt-2 text-xs text-[#6b7280]">
            This is used by our partner institutions for further verification.
          </p>
        </div>

        {/* Company size */}
        <div>
          <label className="block text-sm font-medium text-[#111827]">Company size</label>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {sizeOptions.map((size) => {
              const isSelected = companySize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setCompanySize(size)}
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'border-black bg-black text-white'
                      : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-black'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Company type (optional) */}
        <div>
          <label className="block text-sm font-medium text-[#111827]">
            Company type (optional)
          </label>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {typeOptions.map((type) => {
              const isSelected = companyType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCompanyType(type)}
                  className={`rounded-lg border px-4 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'border-black bg-black text-white'
                      : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-black'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue button */}
        <div className="flex justify-end pt-6">
          <Link
            href="/verify"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#07131e] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.98]"
          >
            Continue
          </Link>
        </div>
      </form>
    </div>
  );
}
