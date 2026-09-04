'use client';

import { FileVideo, ExternalLink } from 'lucide-react';
import { parseLoomEmbedUrl } from '../../lib/public-profile-visibility';

interface LoomEmbedProps {
  loomUrl?: string;
  title?: string;
  className?: string;
}

export function LoomEmbed({ loomUrl, title = 'Project Demo', className = '' }: LoomEmbedProps) {
  const embedUrl = parseLoomEmbedUrl(loomUrl);

  if (!loomUrl) {
    return (
      <div
        className={`w-full aspect-video bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-4 text-center ${className}`}
      >
        <FileVideo className="w-10 h-10 mb-2 text-gray-400 opacity-60" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          No project video submitted
        </span>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div
        className={`w-full aspect-video bg-gray-900 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <FileVideo className="w-10 h-10 mb-3 text-[#00fad0]" />
        <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
        <p className="text-xs text-gray-400 mb-4 max-w-xs truncate">{loomUrl}</p>
        <a
          href={loomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#00fad0]/15 hover:bg-[#00fad0]/25 text-[#00fad0] rounded-xl text-xs font-medium transition-colors"
        >
          Watch External Video
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg ${className}`}
    >
      <iframe
        src={embedUrl}
        title={title}
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
