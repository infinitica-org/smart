import type { TrackCode } from '@smart/contracts';

/** Onboarding “stream” — broader than a single certification track name in the catalog. */
export type CandidateStreamId = 'SOFTWARE_ENGINEERING' | 'DATA_OPS' | 'AIML';

export type CandidateStream = {
  readonly id: CandidateStreamId;
  readonly trackCode: TrackCode;
  readonly title: string;
  /** Short role label for dashboard/profile header, e.g. “Software Engineer”. */
  readonly headlineRole: string;
  readonly description: string;
  readonly available: boolean;
};

export const CANDIDATE_STREAMS: readonly CandidateStream[] = [
  {
    id: 'SOFTWARE_ENGINEERING',
    trackCode: 'TECH_FULLSTACK',
    title: 'Software Engineering / SDE',
    headlineRole: 'Software Engineer',
    description:
      'Core CS fundamentals, full-stack development, algorithms, system design, and testing.',
    available: true,
  },
  {
    id: 'DATA_OPS',
    trackCode: 'TECH_FULLSTACK',
    title: 'DataOps',
    headlineRole: 'DataOps Engineer',
    description: 'Data pipelines, ETL workflows, data warehousing, and infrastructure automation.',
    available: false,
  },
  {
    id: 'AIML',
    trackCode: 'TECH_FULLSTACK',
    title: 'AIML',
    headlineRole: 'AIML Engineer',
    description: 'Machine learning model development, deep learning, LLM fine-tuning, and MLOps.',
    available: false,
  },
] as const;

const _defaultCandidateStream = CANDIDATE_STREAMS.find((s) => s.available) ?? CANDIDATE_STREAMS[0];
if (!_defaultCandidateStream) {
  throw new Error('CANDIDATE_STREAMS must define at least one stream');
}
export const DEFAULT_CANDIDATE_STREAM: CandidateStream = _defaultCandidateStream;

export function candidateStreamForTrack(
  trackCode: string | null | undefined,
): CandidateStream | null {
  if (!trackCode) return null;
  return (
    CANDIDATE_STREAMS.find((stream) => stream.available && stream.trackCode === trackCode) ?? null
  );
}

export function headlineRoleForPrimaryTrack(trackCode: string | null | undefined): string | null {
  return candidateStreamForTrack(trackCode)?.headlineRole ?? null;
}
