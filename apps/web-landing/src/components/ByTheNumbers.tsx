'use client';

import { motion } from 'motion/react';

const STATS = [
  { value: '15M+', label: 'students & alumni', accent: 'from-[#00fad0] to-[#0d9488]' },
  { value: '1M+', label: 'companies hiring', accent: 'from-[#6366f1] to-[#0d9488]' },
  { value: '1,600+', label: 'partner schools', accent: 'from-[#00c9a7] to-[#004c63]' },
] as const;

export default function ByTheNumbers() {
  return (
    <section
      data-section="by-the-numbers"
      aria-labelledby="by-the-numbers-heading"
      className="relative overflow-hidden border-b border-slate-200/70 bg-white"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(0,250,208,0.08),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 flex flex-col items-center sm:mb-12"
        >
          <span className="mb-3 inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            By the numbers
          </span>
          <h2 id="by-the-numbers-heading" className="sr-only">
            Platform scale metrics
          </h2>
          <p className="max-w-md text-center text-sm text-slate-600 sm:text-base">
            A network built for verified talent at scale.
          </p>
        </motion.div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {STATS.map((item, index) => (
            <motion.li
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.55,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <div
                className={`rounded-2xl bg-gradient-to-br ${item.accent} p-[1px] shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition-shadow duration-300 group-hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)]`}
              >
                <div className="flex h-full flex-col items-center rounded-[15px] bg-white/95 px-6 py-10 text-center backdrop-blur-sm sm:py-11">
                  <span
                    className={`font-manrope bg-gradient-to-r ${item.accent} bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-[2.75rem]`}
                  >
                    {item.value}
                  </span>
                  <span className="mt-3 text-sm font-medium text-slate-600 sm:text-[15px]">
                    {item.label}
                  </span>
                  <span
                    className="mt-6 h-px w-12 bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                    aria-hidden
                  />
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
