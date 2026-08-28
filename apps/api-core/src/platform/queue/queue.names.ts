export const SANDBOX_EXECUTION_QUEUE = 'sandbox_execution' as const;
export const AUDIO_EVALUATION_QUEUE = 'audio_evaluation' as const;
export const PDF_GENERATION_QUEUE = 'pdf_generation' as const;

export const SANDBOX_EXECUTION_DLQ = 'sandbox_execution.dlq' as const;
export const AUDIO_EVALUATION_DLQ = 'audio_evaluation.dlq' as const;
export const PDF_GENERATION_DLQ = 'pdf_generation.dlq' as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: false,
};
