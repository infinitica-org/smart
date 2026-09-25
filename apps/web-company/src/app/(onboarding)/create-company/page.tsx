'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CreateCompanyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  }

  function handleClear() {
    setSearchQuery('');
    setIsDropdownOpen(false);
    setSelectedCompany(null);
    setIsCreatingNew(false);
  }

  function handleSelectCreateNew() {
    if (!searchQuery.trim()) return;
    setSelectedCompany(searchQuery.trim());
    setIsCreatingNew(true);
    setIsDropdownOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-[2.25rem]">
        Create or join your company
      </h1>
      <p className="mt-2 text-base text-[#4b5563]">
        100% of Fortune 100 companies rely on us to hire their future workforce.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium text-[#111827]">
            Company Name
          </label>
          <div className="relative mt-2">
            <input
              id="company-name"
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => {
                if (searchQuery.trim().length > 0 && !selectedCompany) {
                  setIsDropdownOpen(true);
                }
              }}
              className={`h-12 w-full rounded-xl border bg-white pl-4 text-sm text-[#111827] placeholder:text-[#9ca3af] transition focus:outline-none ${
                searchQuery
                  ? 'border-2 border-black pr-16'
                  : 'border-[#e5e7eb] pr-11 focus:border-black focus:ring-2 focus:ring-black/10'
              }`}
            />

            <div className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[#6b7280]">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear input"
                  className="rounded-full p-0.5 text-[#6b7280] hover:text-[#111827] focus:outline-none"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M15 9l-6 6M9 9l6 6"
                    />
                  </svg>
                </button>
              ) : null}

              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>

            {/* Dropdown menu when searching */}
            {isDropdownOpen && searchQuery.trim().length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-xl ring-1 ring-black/5">
                <button
                  type="button"
                  onClick={handleSelectCreateNew}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition hover:bg-neutral-50"
                >
                  <span className="text-2xl font-light text-neutral-800">+</span>
                  <span className="text-sm font-medium text-[#111827]">
                    Create new company &quot;{searchQuery}&quot;
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Selected / Created Company Card Preview */}
        {selectedCompany ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="h-16 w-full bg-[#ebedef]" />
            <div className="flex items-center gap-4 px-6 pb-6 pt-0">
              <div className="-mt-6 relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] shadow-sm">
                <svg
                  className="h-6 w-6 text-neutral-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9"
                  />
                </svg>
              </div>
              <span className="pt-2 text-lg font-semibold text-[#111827]">{selectedCompany}</span>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-4">
          <Link
            href="/company-details"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#07131e] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.98]"
          >
            {selectedCompany && isCreatingNew ? 'Create company' : 'Continue'}
          </Link>
        </div>
      </div>
    </div>
  );
}
