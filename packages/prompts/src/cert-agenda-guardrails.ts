import {
  CERT_AGENDA_MAX_UNMATCHED_RATIO,
  CERT_AGENDA_MIN_COVERAGE,
  CERT_AGENDA_MIN_JACCARD,
  CERT_AGENDA_MIN_MAPPED_TOPICS,
  TRACK_DEFINITIONS,
  type TrackCode,
} from '@smart/contracts';

export type CertAgendaGuardFailure = 'sparse_agenda' | 'agenda_drift';

export interface PublisherSyllabus {
  readonly packVersion: string;
  readonly trackCode: TrackCode;
  readonly trackName: string;
  readonly topics: readonly string[];
}

export interface AgendaAlignment {
  readonly mappedTopicCount: number;
  readonly coverage: number;
  readonly jaccard: number;
  readonly unmatchedRatio: number;
  readonly mappedTopics: readonly string[];
}

const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'by']);

export function publisherSyllabus(trackCode: TrackCode): PublisherSyllabus {
  const track = TRACK_DEFINITIONS.find((entry) => entry.code === trackCode);
  if (!track) {
    throw new Error(`No publisher syllabus for track ${trackCode}.`);
  }
  const topics = track.domains.flatMap((domain) => [...domain.topics]);
  return {
    packVersion: 'publisher-syllabus@1',
    trackCode: track.code,
    trackName: track.name,
    topics,
  };
}

export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 1 && !STOP.has(token));
  return new Set(tokens);
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function lineTopicScore(line: string, topic: string): number {
  const haystack = line.toLowerCase();
  const needle = topic.toLowerCase();
  if (haystack.includes(needle)) return 1;
  return jaccard(tokenize(line), tokenize(topic));
}

export function alignAgendaToSyllabus(
  agendaLines: readonly string[],
  syllabus: PublisherSyllabus,
): AgendaAlignment {
  const mapped = new Set<string>();
  let unmatched = 0;
  let scoreSum = 0;

  for (const line of agendaLines) {
    let bestScore = 0;
    let bestTopic: string | undefined;
    for (const topic of syllabus.topics) {
      const score = lineTopicScore(line, topic);
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }
    scoreSum += bestScore;
    if (bestTopic !== undefined && bestScore >= 0.25) {
      mapped.add(bestTopic);
    } else {
      unmatched += 1;
    }
  }

  return {
    mappedTopicCount: mapped.size,
    coverage: syllabus.topics.length === 0 ? 0 : mapped.size / syllabus.topics.length,
    jaccard: agendaLines.length === 0 ? 0 : scoreSum / agendaLines.length,
    unmatchedRatio: agendaLines.length === 0 ? 1 : unmatched / agendaLines.length,
    mappedTopics: [...mapped],
  };
}

export function agendaGuardFailure(alignment: AgendaAlignment): CertAgendaGuardFailure | undefined {
  if (
    alignment.jaccard < CERT_AGENDA_MIN_JACCARD ||
    alignment.unmatchedRatio > CERT_AGENDA_MAX_UNMATCHED_RATIO
  ) {
    return 'agenda_drift';
  }
  if (
    alignment.mappedTopicCount < CERT_AGENDA_MIN_MAPPED_TOPICS ||
    alignment.coverage < CERT_AGENDA_MIN_COVERAGE
  ) {
    return 'sparse_agenda';
  }
  return undefined;
}
