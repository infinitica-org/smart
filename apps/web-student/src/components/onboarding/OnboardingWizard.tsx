'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import ResumeUpload from './steps/ResumeUpload';
import ProfileSetup from './steps/ProfileSetup';

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<'resume' | 'profile'>('resume');
  const router = useRouter();

  const handleNext = () => {
    if (currentStep === 'resume') {
      setCurrentStep('profile');
    } else {
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep === 'profile') {
      setCurrentStep('resume');
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-white dark:bg-black font-sans overflow-hidden text-gray-900 dark:text-white relative">
      {/* Global Background Glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#00fad0]/10 rounded-full blur-[150px] -mr-[200px] -mt-[200px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#00fad0]/5 rounded-full blur-[120px] -ml-[100px] -mb-[100px] pointer-events-none" />

      <div className="flex w-full h-full relative z-10">
        <div className="w-full lg:w-[45%] flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-r border-gray-200/50 dark:border-white/10 relative overflow-y-auto custom-scrollbar">
          <div className="p-8 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                <span className="text-white dark:text-black font-bold text-sm font-display">S</span>
              </div>
              <span className="text-lg font-medium font-display tracking-tight">SMART</span>
              <span className="text-xs text-gray-500 font-medium ml-2 border-l border-gray-300 dark:border-white/10 pl-3">
                powered by Institution
              </span>
            </div>
          </div>
          <div className="px-8 pb-8 shrink-0">
            <div className="flex items-center gap-4 text-sm font-medium font-display">
              <button
                onClick={() => setCurrentStep('resume')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  currentStep === 'resume'
                    ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border-transparent'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                Resume{' '}
                <span className="text-gray-500 text-xs font-sans font-normal ml-1">� 1 min</span>
              </button>
              <button
                onClick={() => setCurrentStep('profile')}
                disabled={currentStep === 'resume'} // Prevent skipping ahead
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  currentStep === 'profile'
                    ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white border-transparent'
                    : 'text-gray-500'
                } ${currentStep === 'resume' ? 'cursor-not-allowed opacity-50' : 'hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'}`}
              >
                Profile{' '}
                <span className="text-gray-500 text-xs font-sans font-normal ml-1">� 3 min</span>
              </button>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full bg-[#00fad0]"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full bg-[#00fad0]"
                  initial={{ width: '0%' }}
                  animate={{ width: currentStep === 'profile' ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="h-1 flex-1 rounded-full bg-white/5" />
            </div>
          </div>

          {/* Dynamic Form Content */}
          <div className="flex-1 px-8 pb-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep === 'resume' ? (
                  <ResumeUpload onContinue={handleNext} />
                ) : (
                  <ProfileSetup onBack={handleBack} onContinue={handleNext} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right Pane: Marketing / Info Area */}
        <div className="hidden lg:flex flex-1 flex-col relative items-center justify-center p-12 overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          {/* Subtle grid background */}

          {/* Floating Cards (Mimicking Alignerr) */}
          <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-xl">
            <div className="flex items-center gap-6 w-full justify-center">
              {/* Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 p-6 rounded-[32px] w-64 shadow-xl shadow-[#00fad0]/5"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">15,000+</h3>
                <p className="text-sm text-gray-500">Signups every day</p>
              </motion.div>

              {/* Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 p-6 rounded-[32px] w-64 shadow-xl shadow-[#00fad0]/5"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">2M+</h3>
                <p className="text-sm text-gray-500">Students in 125 countries</p>
              </motion.div>
            </div>

            {/* Card 3 (Domain Tags) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 p-8 rounded-[40px] w-full max-w-[540px] shadow-xl shadow-[#00fad0]/5 mt-4"
            >
              <h4 className="text-gray-900 dark:text-white font-bold font-display mb-4">
                Opportunities across 20+ domains
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {[
                  'Coding',
                  'Math',
                  'Physics',
                  'Robotics',
                  'Finance',
                  'Writing',
                  'Voice Acting',
                  'Language Translation',
                  'ATC Translation',
                  'Audio Engineering',
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-700 dark:text-gray-300 font-medium"
                  >
                    {tag}
                  </span>
                ))}
                <span className="px-3 py-1.5 rounded-full bg-[#00fad0]/10 border border-[#00fad0]/30 text-xs text-[#00967c] dark:text-[#00fad0] font-medium">
                  + Many More!
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
