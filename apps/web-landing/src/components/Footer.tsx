'use client';

import React from 'react';
import { motion } from 'motion/react';
import { authLoginUrl } from '@/lib/portal-urls';

export default function Footer() {
  return (
    <footer className="relative w-full min-h-[600px] sm:min-h-[800px] bg-[#070707] flex flex-col items-center justify-between overflow-hidden select-none border-t border-white/5">
      {/* Decorative Concentric Circles Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-30">
        <div className="absolute inset-0 border-[0.5px] border-[#00fad0]/20 rounded-full scale-[0.3]" />
        <div className="absolute inset-0 border-[0.5px] border-[#00fad0]/10 rounded-full scale-[0.6]" />
        <div className="absolute inset-0 border-[0.5px] border-[#00fad0]/5 rounded-full scale-[0.9]" />
      </div>

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow w-full px-6 text-center mt-20">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-cabinet font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 text-6xl sm:text-7xl lg:text-[100px] xl:text-[110px] leading-[1.05] tracking-tight mb-16"
        >
          Start
          <br />
          discovering
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <p className="text-[#00fad0] font-medium tracking-widest uppercase text-[11px] sm:text-[13px] mb-8">
            Join the platform
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Primary Action Button */}
            <motion.a
              href="#closing-cta"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 bg-gradient-to-r from-[#00fad0] to-[#004c63] text-white px-8 py-3.5 rounded-full shadow-[0_8px_20px_rgba(0,250,208,0.2)] w-56 justify-center border border-white/20 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="text-[16px] font-semibold leading-tight relative z-10">
                Book a Demo
              </span>
            </motion.a>

            <motion.a
              href={authLoginUrl()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 bg-[#111111] hover:bg-[#1a1a1a] text-white px-8 py-3.5 rounded-full border border-white/10 w-56 justify-center relative overflow-hidden transition-colors"
            >
              <span className="text-[16px] font-semibold leading-tight relative z-10">Sign In</span>
            </motion.a>
          </div>
        </motion.div>
      </div>

      {/* Bottom Footer Links */}
      <div className="relative z-10 w-full px-8 md:px-16 pb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mt-20">
        {/* Left Side: Copyright & Socials */}
        <div className="flex flex-col gap-6">
          <p className="text-[10px] sm:text-[11px] text-white/30 tracking-wide font-light">
            © 2005-2025 SMART Inc., All Rights Reserved
          </p>
          <div className="flex items-center gap-5">
            {/* Social Icons (Outline style) */}
            <a href="#" className="text-white/30 hover:text-[#00fad0] transition-colors">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M4 4l16 16M4 20L20 4" />
              </svg>
            </a>
            <a href="#" className="text-white/30 hover:text-[#00fad0] transition-colors">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href="#" className="text-white/30 hover:text-[#00fad0] transition-colors">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href="#" className="text-white/30 hover:text-[#00fad0] transition-colors">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
              </svg>
            </a>
          </div>
        </div>

        {/* Right Side: Legal Links */}
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          {['Legal', 'Privacy Policy', 'Cookies Policy', 'Cookies Settings'].map((link) => (
            <a
              key={link}
              href="#"
              className="text-white/30 text-[11px] sm:text-[12px] hover:text-[#00fad0] transition-colors font-medium tracking-wide"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
