'use client';

import React from 'react';
import { motion } from 'motion/react';

export default function Audiences() {
  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const metrics = [
    {
      stat: '3×',
      title: 'Hiring faster',
      desc: 'Identical tasks, both using same Opus 4.8 model',
    },
    {
      stat: '48%',
      title: 'more accurate',
      desc: '94.3% vs. 63.6% – on XL enterprise dataset',
    },
    {
      stat: '10/10',
      title: 'consistency',
      desc: 'On multi-step questions vs. 3-8/10 failure',
    },
    {
      stat: '5.5×',
      title: 'faster',
      desc: '1.5 min vs. 9 min, for the same multi-system query',
    },
  ];

  return (
    <section
      id="universities"
      data-section="facts-stats"
      className="w-full bg-[#070707] text-white py-24 sm:py-32 px-6 sm:px-12 select-none scroll-mt-28"
    >
      <div className="max-w-7xl mx-auto">
        {/* Top Header Section */}
        <div className="mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-cabinet font-bold text-5xl sm:text-6xl lg:text-[72px] leading-[1.05] tracking-tight max-w-4xl"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00fad0] via-[#00c6d9] to-[#004c63]">
              SMART&apos;s proven
            </span>{' '}
            <br />
            <span className="text-white">Performance vs. Insitution</span>
          </motion.h2>
        </div>

        {/* Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="flex flex-col bg-[#111111] hover:bg-[#151515] transition-colors duration-500 border border-white/5 hover:border-[#00fad0]/20 p-8 sm:p-10 rounded-2xl h-[320px] shadow-[0_4px_24px_rgba(0,0,0,0.2)] group"
            >
              {/* Top Stats */}
              <div>
                <div className="font-cabinet font-bold text-6xl sm:text-[80px] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-2 group-hover:from-[#00fad0] group-hover:to-[#004c63] transition-all duration-500 leading-none">
                  {metric.stat}
                </div>
                <div className="font-axiforma font-semibold text-lg sm:text-xl text-white/90 tracking-tight">
                  {metric.title}
                </div>
              </div>

              {/* Bottom Text */}
              <div className="mt-auto">
                <div className="text-[14px] font-axiforma font-light text-white/40 leading-relaxed group-hover:text-white/60 transition-colors duration-500">
                  {metric.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
