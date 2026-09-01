import { useRef, useState, useEffect } from 'react';
import { UploadCloud, ArrowRight, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeUploadProps {
  onContinue: () => void;
}

export default function ResumeUpload({ onContinue }: ResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadStatus === 'idle') setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (uploadStatus !== 'idle') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        startUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file) {
        startUpload(file);
      }
    }
  };

  const startUpload = (file: File) => {
    setFileName(file.name);
    setUploadedFile(file);
    setUploadStatus('uploading');
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          console.log('File successfully uploaded:', file);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);
  };

  return (
    <div className="flex flex-col relative w-full max-w-2xl mx-auto">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#00fad0]/5 rounded-full blur-[100px] -mr-[100px] -mt-[100px] pointer-events-none" />

      <div className="mb-10 relative z-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 font-display">
          Share your resume to get started
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          We're excited to learn more about you. Upload your resume so we can match you with the
          best opportunities to apply your skills. Let's build something amazing together!
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative z-10 border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all min-h-[320px] ${
          uploadStatus === 'idle' ? 'cursor-pointer group' : ''
        } ${
          isDragging
            ? 'border-[#00fad0] bg-[#00fad0]/5 shadow-[0_0_30px_rgba(0,250,208,0.1)]'
            : uploadStatus === 'success'
              ? 'border-[#00fad0]/30 bg-[#00fad0]/5'
              : 'border-gray-300 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl hover:border-[#00fad0]/50 hover:bg-white/80 dark:hover:bg-white/10 shadow-lg'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx"
        />

        <AnimatePresence mode="wait">
          {uploadStatus === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[#00fad0]/20 rounded-2xl shadow-lg -rotate-6 transform origin-bottom-left group-hover:-rotate-12 transition-all duration-500 blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#111111] to-[#1a1a1a] rounded-2xl shadow-2xl transform origin-bottom border border-white/10 flex items-center justify-center group-hover:scale-105 transition-all duration-500 z-10">
                  <FileText
                    className={`w-10 h-10 transition-colors duration-500 ${isDragging ? 'text-[#00fad0]' : 'text-gray-400 group-hover:text-[#00fad0]'}`}
                  />
                </div>
              </div>

              <h3 className="text-gray-900 dark:text-white text-lg font-bold mb-2 group-hover:text-[#00fad0] transition-colors">
                Upload your resume
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                <span className="text-[#00fad0] font-medium">Choose your file</span> or drag and
                drop it here
              </p>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full border border-gray-200 dark:border-white/5">
                PDF or DOCX (max 5 MB)
              </span>
            </motion.div>
          )}

          {uploadStatus === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center w-full max-w-sm"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-6 shadow-inner relative">
                <Loader2 className="w-6 h-6 text-[#00fad0] animate-spin" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold mb-2">
                Analyzing Document...
              </h3>
              <p className="text-sm text-gray-400 mb-6 truncate w-full px-4">{fileName}</p>

              <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-[#00fad0]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between w-full text-xs text-gray-500 font-medium">
                <span>Uploading</span>
                <span>{Math.min(progress, 100)}%</span>
              </div>
            </motion.div>
          )}

          {uploadStatus === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-[#00fad0]/10 border border-[#00fad0]/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,250,208,0.2)]">
                <CheckCircle2 className="w-8 h-8 text-[#00fad0]" />
              </div>
              <h3 className="text-gray-900 dark:text-white text-lg font-bold mb-1">
                Resume Uploaded Successfully
              </h3>
              <p className="text-sm text-gray-400 mb-6">{fileName}</p>

              <button
                onClick={() => setUploadStatus('idle')}
                className="text-xs text-[#00fad0] hover:underline"
              >
                Upload a different file
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-12 flex relative z-10">
        <button
          onClick={onContinue}
          disabled={uploadStatus === 'uploading'}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl transition-all text-sm font-semibold ${
            uploadStatus === 'uploading'
              ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-[#00fad0] hover:bg-[#00fad0]/90 text-black shadow-[0_0_20px_rgba(0,250,208,0.2)]'
          }`}
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
