'use client';

import React from 'react';
import { motion } from 'motion/react';

const REVIEWS = [
  {
    id: 1,
    text: 'Your career story is bigger than a document. SMART helps you build a richer representation of what you know, what you can do, and what you can demonstrate.',
    author: 'Candidate Experience',
    time: 'Show your potential',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Candidate&backgroundColor=f5f5f5',
  },
  {
    id: 2,
    text: "Recruitment decisions are often made with incomplete information. SMART helps bring additional evidence into the process so organizations can better understand the capabilities behind a candidate's credentials.",
    author: 'Organization Experience',
    time: 'See beyond the application',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Organization&backgroundColor=f5f5f5',
  },
  {
    id: 3,
    text: 'Learning becomes more valuable when learners can demonstrate what they have gained from it. SMART helps create a stronger connection between learning, capability, evidence, and opportunity.',
    author: 'Institution Experience',
    time: 'Turn learning into evidence',
    avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Institution&backgroundColor=f5f5f5',
  },
];

export default function ClosingCTA() {
  return (
    <section
      data-section="testimonials"
      className="relative w-full h-[850px] lg:h-screen min-h-[800px] select-none overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=2787&auto=format&fit=crop"
          alt="Woman smiling at phone"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent sm:bg-gradient-to-r sm:from-black/80 sm:via-black/40 sm:to-transparent" />
      </div>

      <div className="relative z-10 w-full h-full max-w-[1600px] mx-auto flex flex-col justify-end pb-12 sm:pb-24 px-6 sm:px-12 md:px-20 lg:px-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 lg:gap-8 w-full">
          {/* Left Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col max-w-xl"
          >
            <h2 className="font-display font-medium text-white text-5xl sm:text-6xl lg:text-[76px] leading-[1.05] tracking-tight mb-6">
              Proof creates
              <br />
              confidence.
            </h2>
            <p className="font-body text-[14px] sm:text-[15px] font-light text-white/80 leading-[1.6] max-w-sm mb-8">
              Talent decisions involve uncertainty. SMART is built around the idea that demonstrated
              capability creates stronger confidence than claims alone.
            </p>
          </motion.div>

          {/* Right Review Cards Row */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 -mx-6 px-6 sm:mx-0 sm:px-0 hide-scrollbar snap-x lg:max-w-[55%]"
          >
            {REVIEWS.map((review) => (
              <div
                key={review.id}
                className="flex flex-col shrink-0 bg-white rounded-[32px] p-8 w-[280px] sm:w-[320px] lg:w-[340px] shadow-2xl snap-start"
              >
                {/* Icon (Replaced stars with a check) */}
                <div className="flex items-center gap-1 mb-5 text-[#FF4800]">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>

                {/* Review Text */}
                <p className="font-body font-medium text-[14px] sm:text-[15px] leading-[1.6] text-ink mb-10 flex-grow">
                  {review.text}
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                    <img
                      src={review.avatar}
                      alt={review.author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-ink leading-tight">
                      {review.author}
                    </span>
                    <span className="text-[11px] text-muted">{review.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />
    </section>
  );
}
