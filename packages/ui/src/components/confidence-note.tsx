import type { ConfidenceNoteDto } from '@smart/contracts';
import { Alert } from './alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ConfidenceNoteProps {
  note: ConfidenceNoteDto;
  className?: string;
}

export function ConfidenceNote({ note, className }: ConfidenceNoteProps) {
  const isDowngraded = note.downgraded;
  const tone = isDowngraded ? 'warning' : 'success';
  const Icon = isDowngraded ? AlertCircle : CheckCircle2;

  return (
    <Alert tone={tone} className={className}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h4 className="font-medium mb-1">
            {isDowngraded ? 'Confidence Note Downgraded' : 'Confidence Note'}
          </h4>
          <p className="text-sm opacity-90">{note.noteText}</p>
          {isDowngraded && note.downgradeReason && (
            <p className="text-sm mt-2 font-medium">Reason: {note.downgradeReason}</p>
          )}
        </div>
      </div>
    </Alert>
  );
}
