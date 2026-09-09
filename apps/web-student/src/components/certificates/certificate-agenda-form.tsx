'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TRACK_DEFINITIONS, type TrackCode } from '@smart/contracts';
import { Button } from '@smart/ui';

type Props = {
  certificateId: string;
  initialLines?: string[];
  initialTrack?: TrackCode | null;
  initialExpiry?: string | null;
  onSubmit: (body: {
    trackCode: TrackCode;
    agendaLines: string[];
    expiryDate?: string;
  }) => Promise<void>;
  isPending?: boolean;
  error?: string | null;
};

export function CertificateAgendaForm({
  certificateId,
  initialLines = [],
  initialTrack = null,
  initialExpiry = null,
  onSubmit,
  isPending = false,
  error = null,
}: Props) {
  const [trackCode, setTrackCode] = useState<TrackCode>(initialTrack ?? 'TECH_FULLSTACK');
  const [agendaText, setAgendaText] = useState(initialLines.join('\n'));
  const [expiryDate, setExpiryDate] = useState(initialExpiry ? initialExpiry.slice(0, 10) : '');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const agendaLines = agendaText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    await onSubmit({
      trackCode,
      agendaLines,
      expiryDate: expiryDate || undefined,
    });
  };

  const hasAgenda = initialLines.length > 0;

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
    >
      <h3 className="text-sm font-semibold text-white">Course agenda</h3>
      <p className="mt-1 text-sm text-white/45">
        Paste the syllabus topics you studied. We generate a proctored check from this agenda after
        source verification passes.
      </p>

      <label className="mt-4 block text-xs font-medium text-white/60" htmlFor="cert-track">
        Track
      </label>
      <select
        id="cert-track"
        value={trackCode}
        onChange={(event) => setTrackCode(event.target.value as TrackCode)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
      >
        {TRACK_DEFINITIONS.map((track) => (
          <option key={track.code} value={track.code}>
            {track.name}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-xs font-medium text-white/60" htmlFor="cert-agenda">
        Agenda lines (one topic per line)
      </label>
      <textarea
        id="cert-agenda"
        value={agendaText}
        onChange={(event) => setAgendaText(event.target.value)}
        rows={8}
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        placeholder={'React fundamentals\nREST API design\nPostgreSQL queries\n…'}
      />

      <label className="mt-4 block text-xs font-medium text-white/60" htmlFor="cert-expiry">
        Certificate expiry (optional, display only)
      </label>
      <input
        id="cert-expiry"
        type="date"
        value={expiryDate}
        onChange={(event) => setExpiryDate(event.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
      />

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : hasAgenda ? 'Update agenda' : 'Submit agenda'}
        </Button>
        {hasAgenda ? (
          <Link
            href={`/certificates/${certificateId}/verify`}
            className="text-sm text-[#00fad0] hover:underline"
          >
            Take assessment →
          </Link>
        ) : null}
      </div>
    </form>
  );
}
