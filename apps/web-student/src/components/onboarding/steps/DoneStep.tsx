'use client';

import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { PrimaryButton } from '../wizard-ui';

export default function DoneStep({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-10"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-9 h-9 text-emerald-500" />
      </motion.div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
      <p className="text-gray-500 max-w-sm mb-8">
        Your profile is complete and ready to verify. We&apos;ll start matching you with
        opportunities right away.
      </p>
      <PrimaryButton onClick={onGoToDashboard}>Go to dashboard</PrimaryButton>
    </motion.div>
  );
}
