'use client';

import { useState } from 'react';
import {
  Share2,
  Code2,
  FolderGit2,
  Brain,
  CheckCircle2,
  FileVideo,
  Eye,
  EyeOff,
  Globe,
} from 'lucide-react';

export default function PublicProfilePreviewPage() {
  const [showProjects, setShowProjects] = useState(true);
  const [showCognitive, setShowCognitive] = useState(true);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Settings for the preview */}
      <div className="flex-none px-8 py-6 bg-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-medium text-gray-900 dark:text-white flex items-center gap-3">
              Public Profile Preview
              <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium tracking-wide">
                View Only
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This is how employers and the public will see your profile.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full font-medium text-sm transition-colors text-gray-700 dark:text-gray-300">
              <Globe className="w-4 h-4" />
              Copy Link
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-[#00fad0] hover:bg-[#00e0b0] text-black font-semibold rounded-full transition-colors shadow-sm text-sm">
              <Share2 className="w-4 h-4" />
              Share Profile
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - The actual public profile view */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-50/50 dark:bg-transparent">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Privacy Controls (Only visible to the user in this preview) */}
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-[20px] p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Section Visibility Controls
            </span>
            <div className="flex gap-4">
              <button
                onClick={() => setShowProjects(!showProjects)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showProjects ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
              >
                {showProjects ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                Projects
              </button>
              <button
                onClick={() => setShowCognitive(!showCognitive)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showCognitive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
              >
                {showCognitive ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                Cognitive Profile
              </button>
            </div>
          </div>

          {/* PUBLIC PROFILE CANVAS */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-gray-100 dark:border-white/5 rounded-[40px] shadow-[0_12px_40px_rgb(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgb(0,0,0,0.15)] overflow-hidden">
            {/* Header Banner */}
            <div className="h-32 bg-gradient-to-r from-[#00fad0]/20 to-blue-500/20 relative">
              <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white dark:bg-[#161616] rounded-full p-1.5">
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 dark:text-gray-400">
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
                    Senior React Engineer
                  </p>
                  <p className="text-sm text-gray-500 mt-2">San Francisco, CA</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00fad0]/10 border border-[#00fad0]/30 text-[#00967c] dark:text-[#00fad0] rounded-full text-xs font-bold tracking-wide uppercase">
                  <CheckCircle2 className="w-4 h-4" />
                  SMART Verified
                </div>
              </div>

              {/* Verified Skills */}
              <div className="mt-10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Code2 className="w-4 h-4 text-gray-500" />
                  Verified Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      React.js
                    </span>
                    <div className="w-px h-3 bg-gray-300 dark:bg-white/20" />
                    <span className="text-xs text-[#00967c] dark:text-[#00fad0] font-bold">
                      Advanced
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      TypeScript
                    </span>
                    <div className="w-px h-3 bg-gray-300 dark:bg-white/20" />
                    <span className="text-xs text-[#00967c] dark:text-[#00fad0] font-bold">
                      Advanced
                    </span>
                  </div>
                </div>
              </div>

              {/* Projects (Conditionally Visible) */}
              {showProjects && (
                <div className="mt-10 pt-10 border-t border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                    <FolderGit2 className="w-4 h-4 text-gray-500" />
                    Verified Projects
                  </h3>

                  <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-[24px] p-6 flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-1/3 aspect-video bg-gray-200 dark:bg-black/40 rounded-xl flex flex-col items-center justify-center text-gray-400">
                      <FileVideo className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs font-medium">Loom Embed</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          E-Commerce Microservices
                        </h4>
                        <CheckCircle2 className="w-4 h-4 text-[#00967c] dark:text-[#00fad0]" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        A scalable microservices architecture built with Node.js, Docker, and
                        Kubernetes for handling high-volume e-commerce transactions.
                      </p>
                      <div className="mt-4 flex gap-2">
                        <span className="px-2 py-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 rounded-md">
                          Node.js
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cognitive Profile (Conditionally Visible) */}
              {showCognitive && (
                <div className="mt-10 pt-10 border-t border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-gray-500" />
                    Cognitive & Communication Profile
                  </h3>

                  <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 rounded-2xl p-6">
                    <h4 className="text-purple-700 dark:text-purple-400 font-medium text-sm uppercase tracking-widest mb-3">
                      Core Strengths
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      Demonstrates highly structured problem-solving capabilities, frequently
                      breaking down complex requirements into manageable micro-tasks. Exceptional
                      clarity in technical communication.
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
