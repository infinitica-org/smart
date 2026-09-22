'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Problem() {
  const textRef = useRef<HTMLParagraphElement>(null);

  const paragraphText =
    "Skills can be listed on a resume. Experience can be beautifully formatted. Achievements can be boldly claimed. But underneath the polished PDFs and optimized LinkedIn profiles, recruiters still face the same fundamental challenge: spending countless hours trying to figure out what a candidate can actually do. The current hiring process relies entirely on trusting unverified historical claims, leading to costly mis-hires, biased screening, and overlooked potential. True talent isn't found in what someone says they did in the past—it's discovered in how they perform when presented with real challenges today.";
  const words = paragraphText.split(' ');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    if (!textRef.current) return;

    const wordElements = textRef.current.querySelectorAll('.word');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        wordElements,
        { opacity: 0.2 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: textRef.current,
            start: 'top 80%',
            end: 'bottom 50%',
            scrub: 1,
          },
        },
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="employers"
      data-section="problem"
      className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#070707] text-white px-6 py-24 md:py-32 select-none scroll-mt-28"
    >
      {/* Main Content - Clean & Minimalist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 max-w-5xl mx-auto w-full flex flex-col items-start"
      >
        {/* Editorial Section Title */}
        <div className="w-full flex items-center gap-6 mb-12 sm:mb-16">
          <h2 className="font-cabinet font-medium text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#00fad0] to-[#004c63] uppercase tracking-[0.25em] whitespace-nowrap">
            The Problem
          </h2>
          <div className="h-[1px] w-full bg-gradient-to-r from-[#00fad0]/30 to-transparent"></div>
        </div>

        {/* GSAP Animated Paragraph */}
        <p
          ref={textRef}
          className="text-justify indent-12 sm:indent-[120px] font-cabinet font-light text-[#f4f4f4] text-xl sm:text-3xl lg:text-[40px] leading-[1.4] tracking-tight"
        >
          {words.map((word, i) => (
            <React.Fragment key={i}>
              <span className="word opacity-[0.2] transition-opacity duration-75">{word}</span>
              {i < words.length - 1 && ' '}
            </React.Fragment>
          ))}
        </p>
      </motion.div>
    </section>
  );
}
