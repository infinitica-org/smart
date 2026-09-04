'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Globe, ShieldCheck, Check } from 'lucide-react';
import { DEFAULT_PROFILE } from '../../lib/candidate-dashboard-data';
import {
  DEFAULT_VISIBILITY,
  getVisibilitySettings,
  saveVisibilitySettings,
  subscribeVisibilitySettings,
  type ProfileSectionVisibility,
} from '../../lib/public-profile-visibility';

export function SectionVisibilityToggles() {
  const [settings, setSettings] = useState<ProfileSectionVisibility>(DEFAULT_VISIBILITY);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSettings(getVisibilitySettings());
    return subscribeVisibilitySettings(setSettings);
  }, []);

  const toggleSection = (key: keyof ProfileSectionVisibility) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveVisibilitySettings(updated);
  };

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/p/${DEFAULT_PROFILE.handle}`;
      void navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const visibleCount = Object.values(settings).filter(Boolean).length;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="visibility-controls-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h2
            id="visibility-controls-heading"
            className="text-lg font-medium text-white flex items-center gap-2"
          >
            <ShieldCheck className="w-5 h-5 text-[#00fad0]" />
            Public Profile Visibility Controls
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Control which sections are displayed on your public view-only profile link. Toggling off
            immediately hides the section.
          </p>
        </div>

        <button
          type="button"
          onClick={copyShareLink}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-[#00fad0]/15 hover:bg-[#00fad0]/25 text-[#00fad0] rounded-full text-xs font-semibold transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Globe className="w-4 h-4" />}
          {copied ? 'Link Copied!' : 'Copy Share Link'}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-[#00fad0] bg-[#00fad0]/10 px-3 py-1.5 rounded-lg w-fit">
        <span>{visibleCount} of 4 sections visible on public profile</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Toggle 1: Verified Skills */}
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div>
            <span className="text-sm font-medium text-white block">Verified Skills</span>
            <span className="text-xs text-white/50">CN-T04 Skill Claims & Badges</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showSkills}
            aria-label="Toggle Verified Skills visibility"
            onClick={() => toggleSection('showSkills')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              settings.showSkills
                ? 'bg-[#00fad0]/20 border border-[#00fad0]/40 text-[#00fad0]'
                : 'bg-white/10 border border-white/10 text-white/40'
            }`}
          >
            {settings.showSkills ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {settings.showSkills ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Toggle 2: Verified Certificates */}
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div>
            <span className="text-sm font-medium text-white block">Verified Certificates</span>
            <span className="text-xs text-white/50">Certifications & Credentials</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showCertificates}
            aria-label="Toggle Verified Certificates visibility"
            onClick={() => toggleSection('showCertificates')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              settings.showCertificates
                ? 'bg-[#00fad0]/20 border border-[#00fad0]/40 text-[#00fad0]'
                : 'bg-white/10 border border-white/10 text-white/40'
            }`}
          >
            {settings.showCertificates ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {settings.showCertificates ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Toggle 3: Verified Projects */}
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div>
            <span className="text-sm font-medium text-white block">Verified Projects</span>
            <span className="text-xs text-white/50">SE-T03 Project Walkthrough Videos</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showProjects}
            aria-label="Toggle Verified Projects visibility"
            onClick={() => toggleSection('showProjects')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              settings.showProjects
                ? 'bg-[#00fad0]/20 border border-[#00fad0]/40 text-[#00fad0]'
                : 'bg-white/10 border border-white/10 text-white/40'
            }`}
          >
            {settings.showProjects ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {settings.showProjects ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Toggle 4: Cognitive & Communication */}
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div>
            <span className="text-sm font-medium text-white block">
              Cognitive & Profile Strengths
            </span>
            <span className="text-xs text-white/50">AI & Communication Assessments</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showCognitive}
            aria-label="Toggle Cognitive Profile visibility"
            onClick={() => toggleSection('showCognitive')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              settings.showCognitive
                ? 'bg-[#00fad0]/20 border border-[#00fad0]/40 text-[#00fad0]'
                : 'bg-white/10 border border-white/10 text-white/40'
            }`}
          >
            {settings.showCognitive ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {settings.showCognitive ? 'Visible' : 'Hidden'}
          </button>
        </div>
      </div>
    </section>
  );
}
