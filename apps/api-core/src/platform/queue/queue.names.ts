export const SANDBOX_EXECUTION_QUEUE = 'sandbox_execution' as const;
export const AUDIO_EVALUATION_QUEUE = 'audio_evaluation' as const;
export const PDF_GENERATION_QUEUE = 'pdf_generation' as const;
export const AUDIT_LOG_PURGE_QUEUE = 'audit_log_purge' as const;
export const CREDENTIAL_VERIFICATION_QUEUE = 'credential_verification' as const;
export const QLIX_POLL_QUEUE = 'qlix_poll' as const;
export const QLIX_RECALIBRATION_QUEUE = 'qlix_recalibration' as const;
export const MATCH_RUN_QUEUE = 'match_run' as const;
export const JD_PARSE_QUEUE = 'jd_parse' as const;
export const SKILL_VERIFY_GRADE_QUEUE = 'skill_verify_grade' as const;

export const SANDBOX_EXECUTION_DLQ = 'sandbox_execution.dlq' as const;
export const AUDIO_EVALUATION_DLQ = 'audio_evaluation.dlq' as const;
export const PDF_GENERATION_DLQ = 'pdf_generation.dlq' as const;
export const CREDENTIAL_VERIFICATION_DLQ = 'credential_verification.dlq' as const;
export const QLIX_POLL_DLQ = 'qlix_poll.dlq' as const;
export const QLIX_RECALIBRATION_DLQ = 'qlix_recalibration.dlq' as const;
export const MATCH_RUN_DLQ = 'match_run.dlq' as const;
export const JD_PARSE_DLQ = 'jd_parse.dlq' as const;
export const SKILL_VERIFY_GRADE_DLQ = 'skill_verify_grade.dlq' as const;

/** Playbook OQ-5: monthly batch — never intra-week. */
export const QLIX_RECALIBRATION_JOB_ID = 'qlix-recalibration-monthly' as const;
export const QLIX_RECALIBRATION_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

/** Rolling retention window for `audit_logs` — rows older than this are hard-deleted daily. */
export const AUDIT_LOG_RETENTION_DAYS = 20;
export const AUDIT_LOG_PURGE_JOB_ID = 'audit-log-purge-daily' as const;
export const AUDIT_LOG_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const EVIDENCE_EXPIRATION_QUEUE = 'evidence_expiration' as const;
export const EVIDENCE_EXPIRATION_JOB_ID = 'evidence-expiration-daily' as const;
export const EVIDENCE_EXPIRATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: false,
};
