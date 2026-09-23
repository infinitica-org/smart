'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';

import { studentAppUrl } from '@/lib/portal-urls';

const FILTER_CHIPS = ['Internships', 'Full-time', 'Remote', 'Proven talent only ✓'] as const;

export default function Hero() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const base = studentAppUrl();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (activeFilter && activeFilter !== 'Proven talent only ✓') {
      params.set('type', activeFilter.toLowerCase().replace(/\s+/g, '-'));
    }
    if (activeFilter === 'Proven talent only ✓') {
      params.set('verified', '1');
    }
    const qs = params.toString();
    window.location.href = qs ? `${base}/jobs?${qs}` : `${base}/jobs`;
  }

  return (
    <section
      id="job-seekers"
      data-section="hero"
      className="relative scroll-mt-20 overflow-hidden border-b border-slate-200/70 bg-[#fcfcfd] pb-24 pt-32 sm:pb-32 sm:pt-36"
    >
      {/* Ambient layers */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,250,208,0.18),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 top-20 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-10 h-64 w-64 rounded-full bg-teal-200/35 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.028)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_72%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 text-center sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-[0_2px_12px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:text-[13px]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Verified talent network
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="font-manrope text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.04em] text-slate-900 sm:text-5xl md:text-[3.5rem] lg:text-6xl"
        >
          The right fit.
          <span className="mt-1 block bg-gradient-to-r from-[#00c9a7] via-[#00fad0] to-[#0d9488] bg-clip-text text-transparent">
            Faster.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg md:max-w-2xl"
        >
          15M+ students. 1M+ companies. One network where every profile is real.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 w-full max-w-2xl sm:mt-12"
        >
          <div className="rounded-2xl bg-gradient-to-r from-[#00fad0]/40 via-slate-200/50 to-[#0d9488]/40 p-[1px] shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-2 rounded-[15px] bg-white p-2 sm:flex-row sm:items-center sm:gap-0 sm:p-1.5"
            >
              <label className="flex min-h-[3rem] flex-1 items-center gap-3 rounded-xl px-3 sm:rounded-full sm:px-4">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="shrink-0 text-slate-400"
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M20 20l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="sr-only">Search jobs</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Part-time jobs for students studying design"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none sm:text-base"
                />
              </label>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:mr-0.5 sm:h-10 sm:rounded-full"
              >
                Search
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </motion.button>
            </form>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
        >
          {FILTER_CHIPS.map((label) => {
            const isActive = activeFilter === label;
            return (
              <motion.button
                key={label}
                type="button"
                aria-pressed={isActive}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveFilter(isActive ? null : label)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition-all sm:text-sm ${
                  isActive
                    ? 'border-teal-500/40 bg-gradient-to-b from-teal-50 to-white text-teal-900 shadow-[0_4px_14px_rgba(13,148,136,0.12)]'
                    : 'border-slate-200/90 bg-white/80 text-slate-600 shadow-sm hover:border-slate-300 hover:bg-white hover:shadow-md'
                }`}
              >
                {label}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
