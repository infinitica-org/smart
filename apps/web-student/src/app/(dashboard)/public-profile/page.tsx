'use client';

import { useEffect, useState } from 'react';
import {
  Share2,
  Code2,
  FolderGit2,
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Award,
  Check,
  ExternalLink,
} from 'lucide-react';
import { DEFAULT_PROFILE } from '@/lib/candidate-dashboard-data';
import {
  DEFAULT_VISIBILITY,
  getVisibilitySettings,
  saveVisibilitySettings,
  subscribeVisibilitySettings,
  type ProfileSectionVisibility,
} from '@/lib/public-profile-visibility';
import { LoomEmbed } from '@/components/profile/LoomEmbed';

export default function PublicProfilePreviewPage() {
  const [visibility, setVisibility] = useState<ProfileSectionVisibility>(DEFAULT_VISIBILITY);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVisibility(getVisibilitySettings());
    return subscribeVisibilitySettings(setVisibility);
  }, []);

  const toggleSection = (key: keyof ProfileSectionVisibility) => {
    const updated = { ...visibility, [key]: !visibility[key] };
    setVisibility(updated);
    saveVisibilitySettings(updated);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/p/${DEFAULT_PROFILE.handle}`;
      void navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Settings for the preview */}
      <div className="flex-none px-6 py-5 bg-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-medium text-gray-900 dark:text-white flex items-center gap-3">
              Public Profile Preview
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium tracking-wide">
                Candidate View
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Changes made here or on your private profile update your public URL immediately.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full font-medium text-sm transition-colors text-gray-700 dark:text-gray-300"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {copied ? 'Link Copied!' : 'Copy Share Link'}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00fad0] hover:bg-[#00e0b0] text-black font-semibold rounded-full transition-colors shadow-sm text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share Profile
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - The actual public profile view */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-50/50 dark:bg-transparent">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Privacy Controls (Only visible to candidate in this preview bar) */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <span>Candidate Section Visibility Controls</span>
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => toggleSection('showSkills')}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  visibility.showSkills ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                }`}
              >
                {visibility.showSkills ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                Skills
              </button>
              <button
                type="button"
                onClick={() => toggleSection('showCertificates')}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  visibility.showCertificates ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                }`}
              >
                {visibility.showCertificates ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                Certificates
              </button>
              <button
                type="button"
                onClick={() => toggleSection('showProjects')}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  visibility.showProjects ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                }`}
              >
                {visibility.showProjects ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                Projects
              </button>
              <button
                type="button"
                onClick={() => toggleSection('showCognitive')}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  visibility.showCognitive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                }`}
              >
                {visibility.showCognitive ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                Cognitive
              </button>
            </div>
          </div>

          {/* PUBLIC PROFILE CANVAS */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-white/5 rounded-[40px] shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.15)] overflow-hidden">
            {/* Header Banner */}
            <div className="h-36 bg-gradient-to-r from-[#00fad0]/25 via-blue-500/20 to-purple-600/20 relative">
              <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white dark:bg-[#161616] rounded-full p-1.5 shadow-md">
                <div className="w-full h-full bg-gradient-to-br from-[#00fad0]/30 to-blue-600/30 rounded-full flex items-center justify-center text-2xl font-bold text-gray-900 dark:text-white">
                  JD
                </div>
              </div>
            </div>

            <div className="pt-16 px-8 pb-8">
              {/* Basic Info */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">John Doe</h1>
                  <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">
                    Senior Fullstack & Cloud Engineer
                  </p>
                  <p className="text-sm text-gray-500 mt-1">San Francisco, CA • Open to Remote</p>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00fad0]/10 border border-[#00fad0]/30 text-[#00967c] dark:text-[#00fad0] rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  SMART Verified Profile
                </div>
              </div>

              {/* Verified Skills Section */}
              {visibility.showSkills && (
                <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Code2 className="w-4 h-4 text-[#00fad0]" />
                    Verified Skills (CN-T04)
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        React.js
                      </span>
                      <div className="w-px h-3 bg-gray-300 dark:bg-white/20" />
                      <span className="text-xs text-[#00967c] dark:text-[#00fad0] font-bold">
                        Advanced (Level 4)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        TypeScript
                      </span>
                      <div className="w-px h-3 bg-gray-300 dark:bg-white/20" />
                      <span className="text-xs text-[#00967c] dark:text-[#00fad0] font-bold">
                        Advanced (Level 4)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Node.js & NestJS
                      </span>
                      <div className="w-px h-3 bg-gray-300 dark:bg-white/20" />
                      <span className="text-xs text-[#00967c] dark:text-[#00fad0] font-bold">
                        Intermediate (Level 3)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Certificates Section */}
              {visibility.showCertificates && (
                <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                    <Award className="w-4 h-4 text-[#00fad0]" />
                    Verified Certificates
                  </h3>

                  <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-[24px] p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          AWS Certified Solutions Architect
                        </h4>
                        <CheckCircle2 className="w-4 h-4 text-[#00967c] dark:text-[#00fad0]" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Amazon Web Services • Issued Aug 2025
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 rounded-lg">
                          Cloud Architecture
                        </span>
                        <span className="px-2.5 py-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 rounded-lg">
                          Serverless & Docker
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-[#00fad0]/10 text-[#00967c] dark:text-[#00fad0] text-xs font-semibold rounded-full border border-[#00fad0]/30">
                      Verified Credentials
                    </span>
                  </div>
                </div>
              )}

              {/* Verified Projects Section (With Embedded Loom Video) */}
              {visibility.showProjects && (
                <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                    <FolderGit2 className="w-4 h-4 text-[#00fad0]" />
                    Verified Projects (SE-T03 / CN-T08)
                  </h3>

                  <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-[24px] p-6 space-y-6">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            High-Throughput E-Commerce Microservices
                          </h4>
                          <CheckCircle2 className="w-4 h-4 text-[#00967c] dark:text-[#00fad0]" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          Scalable microservices architecture built with NestJS, Kafka, and
                          PostgreSQL, featuring real-time order processing and AI fraud detection.
                        </p>
                      </div>
                      <span className="px-3 py-1.5 bg-[#00fad0]/10 text-[#00967c] dark:text-[#00fad0] text-xs font-semibold rounded-full border border-[#00fad0]/30 whitespace-nowrap">
                        Verification Passed
                      </span>
                    </div>

                    {/* Embedded Loom Video Walkthrough */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                        Project Walkthrough Video
                      </span>
                      <LoomEmbed
                        loomUrl="https://www.loom.com/share/e1234567890abcdef1234567890abcde"
                        title="E-Commerce Microservices Walkthrough"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/40 dark:border-white/5">
                      <div className="flex gap-2">
                        <span className="px-2.5 py-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 rounded-lg">
                          NestJS
                        </span>
                        <span className="px-2.5 py-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 rounded-lg">
                          Kafka
                        </span>
                        <span className="px-2.5 py-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 rounded-lg">
                          PostgreSQL
                        </span>
                      </div>
                      <a
                        href="https://github.com/example/ecommerce-microservices"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                      >
                        GitHub Repo
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Cognitive & Communication Profile Section */}
              {visibility.showCognitive && (
                <div className="mt-10 pt-8 border-t border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-[#00fad0]" />
                    Cognitive & Communication Profile
                  </h3>

                  <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 rounded-2xl p-6">
                    <h4 className="text-purple-700 dark:text-purple-400 font-medium text-xs uppercase tracking-widest mb-3">
                      Assessed Core Strengths
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      Demonstrates highly structured problem-solving capabilities, systematically
                      deconstructing complex requirements into modular components. Clear and concise
                      technical communication with high analytical accuracy under pressure.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
