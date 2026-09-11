import type {
  AssessmentPerformanceEntry,
  AssessmentPerformanceVector,
  ProficiencyLevel,
  SignalWeightModel,
  TrustWeightedReadoutEntry,
  VectorizedSignal,
  VectorizedSignalEntry,
} from '@smart/contracts';
import { roundTo } from '../statistics.js';
import { resolveSignalWeight } from './default-weights.js';
import { DEFAULT_CORROBORATION_POLICY, type CorroborationPolicy } from './policy.js';

export interface FuseSignalsInput {
  readonly passiveX: VectorizedSignal | null;
  readonly assessmentY: AssessmentPerformanceVector | null;
  readonly weights: SignalWeightModel;
  readonly policy?: CorroborationPolicy;
}

export interface FuseSignalsResult {
  readonly readouts: readonly TrustWeightedReadoutEntry[];
  readonly contradictionDimensions: readonly string[];
}

function dimensionKey(ref: { dimensionKey: string; taxonomyVersion: string }): string {
  return `${ref.taxonomyVersion}:${ref.dimensionKey}`;
}

function aggregatePassiveByDimension(
  entries: readonly VectorizedSignalEntry[],
  weights: SignalWeightModel,
): Map<
  string,
  { passiveScore: number; confidence: number; dimension: VectorizedSignalEntry['dimension'] }
> {
  const map = new Map<
    string,
    { passiveScore: number; confidence: number; dimension: VectorizedSignalEntry['dimension'] }
  >();

  for (const entry of entries) {
    const key = dimensionKey(entry.dimension);
    const weight = resolveSignalWeight(weights, entry.sourceId, entry.dimension.dimensionKey);
    const weighted = entry.score * weight;
    const existing = map.get(key);
    if (!existing || weighted > existing.passiveScore) {
      map.set(key, {
        passiveScore: Math.min(1, weighted),
        confidence: entry.confidence,
        dimension: entry.dimension,
      });
    }
  }

  return map;
}

function assessmentByDimension(
  entries: readonly AssessmentPerformanceEntry[],
): Map<string, AssessmentPerformanceEntry> {
  const map = new Map<string, AssessmentPerformanceEntry>();
  for (const entry of entries) {
    map.set(dimensionKey(entry.dimension), entry);
  }
  return map;
}

function computeAgreement(passiveNorm: number, assessmentNorm: number): number {
  return roundTo((1 - Math.abs(passiveNorm - assessmentNorm)) * 100, 2);
}

function passiveOnlyScore(passiveNorm: number, confidence: number): number {
  return roundTo(passiveNorm * confidence * 100, 2);
}

function shouldFlagContradiction(
  passed: boolean,
  passiveNorm: number,
  confidence: number,
  proficiency: ProficiencyLevel | undefined,
  policy: CorroborationPolicy,
): boolean {
  if (!passed || confidence < policy.minPassiveConfidence) return false;
  const level = proficiency ?? 'BEGINNER';
  const floor = policy.contradictionFloor[level];
  return passiveNorm < floor;
}

/**
 * Fuses passive (X) and assessment (Y) signals into trust-weighted readouts.
 * Never mutates verification status — callers persist readouts and optional review flags.
 */
export function fuseSignals(input: FuseSignalsInput): FuseSignalsResult {
  const policy = input.policy ?? DEFAULT_CORROBORATION_POLICY;
  const passiveMap = input.passiveX
    ? aggregatePassiveByDimension(input.passiveX.entries, input.weights)
    : new Map();
  const assessmentMap = input.assessmentY
    ? assessmentByDimension(input.assessmentY.entries)
    : new Map();

  const allKeys = new Set([...passiveMap.keys(), ...assessmentMap.keys()]);
  const readouts: TrustWeightedReadoutEntry[] = [];
  const contradictionDimensions: string[] = [];

  for (const key of allKeys) {
    const passive = passiveMap.get(key);
    const assessment = assessmentMap.get(key);
    const dimension = passive?.dimension ?? assessment?.dimension;
    if (!dimension) continue;

    const passiveNorm = passive?.passiveScore ?? null;
    const passiveConfidence = passive?.confidence ?? 0;
    const assessmentScore = assessment?.scorePercent ?? null;
    const assessmentNorm = assessmentScore !== null ? assessmentScore / 100 : null;

    let corroborationScore: number;
    let confidence: number;
    let contradictionFlag = false;

    if (assessmentNorm !== null && passiveNorm !== null) {
      corroborationScore = computeAgreement(passiveNorm, assessmentNorm);
      confidence = roundTo(Math.min(1, passiveConfidence + 0.5), 2);
      contradictionFlag = shouldFlagContradiction(
        assessment.passed,
        passiveNorm,
        passiveConfidence,
        assessment.proficiencyLevel,
        policy,
      );
    } else if (passiveNorm !== null) {
      corroborationScore = passiveOnlyScore(passiveNorm, passiveConfidence);
      confidence = passiveConfidence;
    } else if (assessmentScore !== null) {
      corroborationScore = assessmentScore;
      confidence = 0.9;
    } else {
      continue;
    }

    if (contradictionFlag) {
      contradictionDimensions.push(dimension.dimensionKey);
    }

    readouts.push({
      dimension,
      passiveScore: passiveNorm,
      assessmentScore: assessmentScore,
      corroborationScore,
      confidence,
      contradictionFlag,
    });
  }

  return { readouts, contradictionDimensions };
}
