'use client';

import { useEffect, useState } from 'react';
import {
  Code2,
  FolderGit2,
  Brain,
  CheckCircle2,
  Globe,
  Award,
  Check,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { DEFAULT_PROFILE } from '@/lib/candidate-dashboard-data';
import {
  DEFAULT_VISIBILITY,
  getVisibilitySettings,
  subscribeVisibilitySettings,
  type ProfileSectionVisibility,
} from '@/lib/public-profile-visibility';
import { LoomEmbed } from '@/components/profile/LoomEmbed';

export default function ShareablePublicProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params?.id || DEFAULT_PROFILE.handle;
  const [visibility, setVisibility] = useState<ProfileSectionVisibility>(DEFAULT_VISIBILITY);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVisibility(getVisibilitySettings());
    return subscribeVisibilitySettings(setVisibility);
  }, []);

  const displayName =
    profileId === DEFAULT_PROFILE.handle || profileId === 'share'
      ? `${DEFAULT_PROFILE.firstName} ${DEFAULT_PROFILE.lastName}`
      : profileId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0e0e11] text-gray-900 dark:text-gray-100 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ShieldCheck className="w-5 h-5 text-[#00fad0]" />
            <span>SMART Verified Candidate Profile</span>
            <span className="px-2 py-0.5 bg-gray-200 dark:bg-white/10 text-xs font-mono text-gray-600 dark:text-gray-400 rounded-md">
              @{profileId}
            </span>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full font-medium text-xs transition-colors text-gray-700 dark:text-gray-300 shadow-sm"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            {copied ? 'Link Copied' : 'Share Profile'}
          </button>
        </div>

        {/* PUBLIC PROFILE CANVAS */}
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-[40px] shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.2)] overflow-hidden">
          {/* Header Banner */}
          <div className="h-36 bg-gradient-to-r from-[#00fad0]/25 via-blue-500/20 to-purple-600/20 relative">
            <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white dark:bg-[#161616] rounded-full p-1.5 shadow-md">
              <div className="w-full h-full bg-gradient-to-br from-[#00fad0]/30 to-blue-600/30 rounded-full flex items-center justify-center text-2xl font-bold text-gray-900 dark:text-white">
                {initials}
              </div>
            </div>
          </div>

          <div className="pt-16 px-8 pb-8">
            {/* Basic Info */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">
                  {DEFAULT_PROFILE.headline}
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
                  Verified Skills
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
                  Verified Projects
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
  );
}
