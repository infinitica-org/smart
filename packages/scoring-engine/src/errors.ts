import { Data } from 'effect';

/**
 * Typed, exhaustive failure modes for the scoring engine.
 *
 * Effect makes these part of the function signature, so a caller cannot forget
 * to handle "cut scores are not published yet" — which is exactly the kind of
 * omission that would otherwise ship a certificate with an invented tier.
 *
 * Owner: Ramansh.
 */

export class UnpublishedCutScoresError extends Data.TaggedError('UnpublishedCutScoresError')<{
  readonly trackCode: string;
  readonly levelNumber: number;
  readonly message: string;
}> {}

export class InsufficientPanelError extends Data.TaggedError('InsufficientPanelError')<{
  readonly panelistCount: number;
  readonly required: number;
  readonly message: string;
}> {}

export class InvalidScoreError extends Data.TaggedError('InvalidScoreError')<{
  readonly value: number;
  readonly message: string;
}> {}

export class InvalidWeightsError extends Data.TaggedError('InvalidWeightsError')<{
  readonly sum: number;
  readonly message: string;
}> {}

export class NonMonotonicCutScoresError extends Data.TaggedError('NonMonotonicCutScoresError')<{
  readonly gold: number;
  readonly silver: number;
  readonly bronze: number;
  readonly message: string;
}> {}

export class InsufficientSampleError extends Data.TaggedError('InsufficientSampleError')<{
  readonly sampleSize: number;
  readonly required: number;
  readonly message: string;
}> {}

export type ScoringError =
  | UnpublishedCutScoresError
  | InsufficientPanelError
  | InvalidScoreError
  | InvalidWeightsError
  | NonMonotonicCutScoresError
  | InsufficientSampleError;
