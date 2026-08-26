'use client';

import { useState } from 'react';
import { cn } from '../lib/cn';
import { Mic, Square } from 'lucide-react';
import { Button } from './button';

export interface AudioRecorderProps {
  onRecordStart?: () => void;
  onRecordStop?: (blob: Blob | null) => void;
  isRecordingProp?: boolean; // Controlled state if provided
  className?: string;
}

export function AudioRecorder({
  onRecordStart,
  onRecordStop,
  isRecordingProp,
  className,
}: AudioRecorderProps) {
  const [isRecordingLocal, setIsRecordingLocal] = useState(false);
  const isRecording = isRecordingProp ?? isRecordingLocal;

  const handleToggle = () => {
    if (isRecording) {
      setIsRecordingLocal(false);
      onRecordStop?.(null); // Shell returns null, actual implementation would return Blob
    } else {
      setIsRecordingLocal(true);
      onRecordStart?.();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border p-4 bg-[var(--bg-surface)]',
        className,
      )}
    >
      <Button
        variant={isRecording ? 'danger' : 'primary'}
        size="md"
        onClick={handleToggle}
        className={cn('min-w-[150px]', isRecording && 'animate-pulse')}
      >
        {isRecording ? (
          <>
            <Square className="mr-2 h-4 w-4" fill="currentColor" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Start Recording
          </>
        )}
      </Button>

      <div className="flex items-center gap-2">
        {isRecording ? (
          <div className="flex items-center gap-2 text-danger text-sm font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-danger"></span>
            </span>
            Recording...
          </div>
        ) : (
          <span className="text-sm text-[var(--text-muted)] font-medium">Microphone ready</span>
        )}
      </div>
    </div>
  );
}
