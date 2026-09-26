'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Building2, Award, ShieldCheck, ChevronDown, Check } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

const ROLE_OPTIONS: Option[] = [
  { label: 'Student', value: 'student' },
  { label: 'Career center staff — My institution has SMART', value: 'staff_has_smart' },
  { label: 'Career center staff — My institution does not have SMART', value: 'staff_no_smart' },
];

const REFERRAL_OPTIONS: Option[] = [
  { label: 'SMART webinar', value: 'webinar' },
  { label: 'SMART blog', value: 'blog' },
  { label: 'Conference / event', value: 'conference' },
  { label: 'Employers', value: 'employers' },
  { label: 'Colleague from a career center partnered with SMART', value: 'colleague' },
  { label: 'Other', value: 'other' },
];

const FUNCTION_OPTIONS: Option[] = [
  { label: 'Director of Career Center', value: 'director' },
  { label: 'Employer Relations', value: 'employer_relations' },
  { label: 'Student Marketing & Engagement', value: 'student_marketing' },
  { label: 'Data Analyst', value: 'data_analyst' },
  { label: 'Career Coaching & Advising', value: 'coaching_advising' },
  { label: 'Senior Academic Leadership; President', value: 'leadership' },
  { label: 'Other', value: 'other' },
];

function NeatSelect({
  label,
  options,
  value,
  placeholder = 'Select...',
  onChange,
  required,
  preferredPlacement,
}: {
  label: string;
  options: Option[];
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  required?: boolean;
  preferredPlacement?: 'top' | 'bottom';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    if (!isOpen && containerRef.current) {
      if (preferredPlacement === 'top') {
        setOpenUpward(true);
      } else if (preferredPlacement === 'bottom') {
        setOpenUpward(false);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < 280 && rect.top > 200);
      }
    }
    setIsOpen((prev) => !prev);
  }

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-semibold text-slate-800 mb-2">{label}</label>

      <button
        type="button"
        onClick={handleToggle}
        className={`w-full h-12 rounded-lg border bg-slate-50/60 px-4 text-sm text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${
          isOpen
            ? 'border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-sm'
            : 'border-slate-200 hover:border-slate-300 focus:bg-white focus:border-slate-900'
        }`}
      >
        <span className={selectedOption ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-900' : ''
          }`}
        />
      </button>

      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: openUpward ? 6 : -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-40 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/15 ${
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            }`}
          >
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white font-medium shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && <Check className="size-4 shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CareerCenterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    institutionName: '',
    role: '',
    referralSource: '',
    functions: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelectChange(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-[#18001e] text-white">
      {/* ------------------- HERO SECTION (Image 1 style) ------------------- */}
      <section className="relative overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-32 text-center select-none">
        {/* Ambient Gradient Glow Highlights */}
        <div
          className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#c0ec31]/10 blur-[140px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 size-[400px] rounded-full bg-purple-600/20 blur-[100px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-cabinet font-extrabold text-[3.25rem] sm:text-[5rem] lg:text-[6.25rem] leading-[0.92] tracking-tight text-[#c0ec31]"
          >
            Get your
            <br />
            students hired
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-8 max-w-2xl text-base sm:text-xl font-normal leading-relaxed text-purple-100/90"
          >
            Strengthen your team&apos;s connections with employers and drive student success on the
            career readiness network built for early talent.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex items-center justify-center"
          >
            <a
              href="#connect-form"
              className="inline-flex items-center justify-center rounded-full bg-[#c0ec31] px-8 py-3.5 text-base font-semibold text-[#18001e] shadow-lg shadow-[#c0ec31]/20 transition-all hover:scale-105 hover:bg-[#b0dc25] active:scale-95"
            >
              Contact us
            </a>
          </motion.div>
        </div>
      </section>

      {/* ------------------- VALUE PROPOSITION GRID ------------------- */}
      <section className="bg-white py-20 px-4 sm:px-6 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">
              Empowering Career Services
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Built for Placement Offices & Career Centers
            </h2>
            <p className="mt-4 text-slate-600 text-base leading-relaxed">
              Equip your institution with verified competency credentials, direct enterprise
              recruiter integrations, and real-time student placement dashboards.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 hover:shadow-lg transition">
              <div className="size-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-6">
                <Award className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">5×3 Grid Certification</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Provide students with industry-standard, role-specific readiness assessments
                verified on a transparent tier grid.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 hover:shadow-lg transition">
              <div className="size-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6">
                <Building2 className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Direct Employer Inflow</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Connect your talent pipeline with active enterprise recruiters who filter candidates
                by validated skill competencies.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8 hover:shadow-lg transition">
              <div className="size-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-6">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Publicly Verifiable Credentials
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Issue tamper-proof badges and verification URLs that students can share on LinkedIn,
                resumes, and portfolios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------- LET'S CONNECT FORM (Image 2 style) ------------------- */}
      <section
        id="connect-form"
        className="bg-[#fcfdfd] py-20 px-4 sm:px-6 border-t border-slate-100"
      >
        <div className="mx-auto max-w-xl">
          <div className="mb-10 text-left">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Let&apos;s Connect
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Discover how SMART can help transform your campus career center outcomes.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center space-y-4">
              <div className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-emerald-900">Thank You!</h3>
              <p className="text-sm text-emerald-700 max-w-md mx-auto leading-relaxed">
                Your request has been received. Our university partnerships team will get in touch
                with you shortly to schedule a demo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              {/* First Name & Last Name */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    First name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    placeholder="E.g. Kristen"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Last name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    placeholder="E.g. Smith"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="E.g. name@smart.edu"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Phone number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="E.g. 212-111-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>

              {/* Institution Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Institution Name
                </label>
                <input
                  type="text"
                  name="institutionName"
                  required
                  placeholder="E.g. SMART University"
                  value={formData.institutionName}
                  onChange={handleChange}
                  className="w-full h-12 rounded-lg border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
                />
              </div>

              {/* Role Select (Custom Neat UI) */}
              <NeatSelect
                label="What best describes your role?"
                options={ROLE_OPTIONS}
                value={formData.role}
                required
                onChange={(val) => handleSelectChange('role', val)}
              />

              {/* Referral Source Select (Custom Neat UI) */}
              <NeatSelect
                label="Did you read, attend, or hear anything that made you want to contact SMART?"
                options={REFERRAL_OPTIONS}
                value={formData.referralSource}
                onChange={(val) => handleSelectChange('referralSource', val)}
              />

              {/* Functions Select (Custom Neat UI) */}
              <NeatSelect
                label="What best describes your function(s)?"
                options={FUNCTION_OPTIONS}
                value={formData.functions}
                onChange={(val) => handleSelectChange('functions', val)}
              />

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-[#07242b] px-8 text-sm font-bold text-white shadow-md transition-all hover:bg-black active:scale-[0.99] disabled:opacity-70"
                >
                  {loading ? 'Submitting…' : 'Schedule a demo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
