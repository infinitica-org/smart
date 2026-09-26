import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * The Prometheus metric registry.
 *
 * Metrics are declared here, once, rather than created ad hoc in each module.
 * Prometheus rejects a re-registered metric name at runtime, so a metric created
 * inside a request handler is a crash waiting for the second request — and
 * central declaration also means the Grafana dashboards have a fixed contract.
 *
 * Naming follows Prometheus convention: `smart_<subsystem>_<thing>_<unit>`.
 *
 * Owner: Vishal V. New metrics: add here, then add the panel.
 */

export const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: 'smart_' });

/* ------------------------------ HTTP surface ------------------------------ */

/**
 * Buckets chosen around the SLA, not on a log scale: the candidate-critical
 * budget is 200 ms, so the histogram needs resolution either side of it or the
 * SLO alert cannot distinguish 190 ms from 900 ms.
 */
const LATENCY_BUCKETS_SECONDS = [0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5, 10];

export const httpRequestDuration = new Histogram({
  name: 'smart_http_request_duration_seconds',
  help: 'HTTP request duration by route and status.',
  labelNames: ['method', 'route', 'status_code', 'module'] as const,
  buckets: LATENCY_BUCKETS_SECONDS,
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'smart_http_requests_total',
  help: 'Total HTTP requests by route and status.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

/* ------------------------------- file scanning ------------------------------ */

/** S6-VV-120 — upload malware scans by outcome (clean / infected / error). */
export const fileScansTotal = new Counter({
  name: 'smart_file_scans_total',
  help: 'Upload malware scans by result.',
  labelNames: ['result'] as const,
  registers: [registry],
});

/* ------------------------------ rate limiting ----------------------------- */

export const rateLimitRejections = new Counter({
  name: 'smart_rate_limit_rejections_total',
  help: 'Requests rejected with 429, by policy and role.',
  labelNames: ['policy', 'role', 'route'] as const,
  registers: [registry],
});

/**
 * How close a bucket got to its ceiling.
 *
 * The interesting number is not "did we reject" but "were we about to": a policy
 * sitting at 95 % during a placement drive needs raising before the drive, not
 * after a TPO is locked out mid-shortlist.
 */
export const rateLimitUtilisation = new Gauge({
  name: 'smart_rate_limit_utilisation_ratio',
  help: 'Peak observed consumption of a rate-limit budget, 0-1.',
  labelNames: ['policy', 'role'] as const,
  registers: [registry],
});

/* --------------------------------- AI cost -------------------------------- */

export const aiCallsTotal = new Counter({
  name: 'smart_ai_calls_total',
  help: 'AI gateway calls by prompt, provider and outcome.',
  labelNames: ['prompt_ref', 'provider', 'outcome', 'priority'] as const,
  registers: [registry],
});

export const aiCallDuration = new Histogram({
  name: 'smart_ai_call_duration_seconds',
  help: 'AI provider latency by prompt and provider.',
  labelNames: ['prompt_ref', 'provider'] as const,
  buckets: [0.5, 1, 2, 4, 6, 10, 20, 40, 60],
  registers: [registry],
});

/**
 * Spend, in dollars, as a counter.
 *
 * AI cost is the one operating expense that scales linearly with candidates, so
 * it is instrumented as carefully as latency. A monthly ceiling with no metric
 * behind it is a ceiling nobody notices until the invoice.
 */
export const aiSpendUsd = new Counter({
  name: 'smart_ai_spend_usd_total',
  help: 'Estimated AI spend in USD by provider and prompt.',
  labelNames: ['provider', 'prompt_ref'] as const,
  registers: [registry],
});

export const aiFallbackTotal = new Counter({
  name: 'smart_ai_fallback_total',
  help: 'Calls served by the fallback provider after a primary failure.',
  labelNames: ['from_provider', 'to_provider', 'reason'] as const,
  registers: [registry],
});

/**
 * Guardrail repair rate: how often model output needed fixing before it parsed.
 * A climbing rate on one prompt means that prompt needs rewording.
 */
export const aiGuardrailOutcomes = new Counter({
  name: 'smart_ai_guardrail_outcomes_total',
  help: 'Model output validation outcomes by prompt.',
  labelNames: ['prompt_ref', 'outcome'] as const,
  registers: [registry],
});

/* ---------------------------- assessment domain --------------------------- */

export const attemptsStarted = new Counter({
  name: 'smart_attempts_started_total',
  help: 'Assessment attempts started by track and level.',
  labelNames: ['track_code', 'level_number'] as const,
  registers: [registry],
});

export const attemptsCompleted = new Counter({
  name: 'smart_attempts_completed_total',
  help: 'Assessment attempts completed by track, level and awarded tier.',
  labelNames: ['track_code', 'level_number', 'tier'] as const,
  registers: [registry],
});

export const draftsSaved = new Counter({
  name: 'smart_drafts_saved_total',
  help: 'Answer drafts saved by track and level.',
  labelNames: ['track_code', 'level_number'] as const,
  registers: [registry],
});

/**
 * Tier distribution as a gauge.
 *
 * This is the platform's honesty dashboard. If Gold share drifts upward without
 * a recalibration, the standard has slipped, and that is the failure mode SMART
 * exists to prevent. Watched, alerted on, and reviewed at every sprint review.
 */
export const tierDistribution = new Gauge({
  name: 'smart_tier_distribution_ratio',
  help: 'Share of results at each tier, per track and level, 0-1.',
  labelNames: ['track_code', 'level_number', 'tier'] as const,
  registers: [registry],
});

export const integrityFlags = new Counter({
  name: 'smart_integrity_flags_total',
  help: 'Integrity signals raised during attempts, by flag type.',
  labelNames: ['flag', 'track_code', 'level_number'] as const,
  registers: [registry],
});

/**
 * Cohen's kappa per track/level — the automated-scoring circuit breaker.
 * Alert on this dropping below 0.65: it means grading must route to humans.
 */
export const interRaterKappa = new Gauge({
  name: 'smart_inter_rater_kappa',
  help: "Cohen's kappa between automated and human raters, by track and level.",
  labelNames: ['track_code', 'level_number'] as const,
  registers: [registry],
});

export const automatedScoringPaused = new Gauge({
  name: 'smart_automated_scoring_paused',
  help: '1 when automated scoring is paused for a track/level, else 0.',
  labelNames: ['track_code', 'level_number'] as const,
  registers: [registry],
});

/* ------------------------------ infrastructure ---------------------------- */

export const kafkaEventsProduced = new Counter({
  name: 'smart_kafka_events_produced_total',
  help: 'Kafka events produced by topic.',
  labelNames: ['topic', 'producer_module'] as const,
  registers: [registry],
});

export const kafkaEventsConsumed = new Counter({
  name: 'smart_kafka_events_consumed_total',
  help: 'Kafka events consumed by topic, consumer group and outcome.',
  labelNames: ['topic', 'consumer_group', 'outcome'] as const,
  registers: [registry],
});

/**
 * Consumer lag in messages.
 *
 * The metric that tells us evaluation is falling behind *before* candidates
 * start asking why their result has not appeared.
 */
export const kafkaConsumerLag = new Gauge({
  name: 'smart_kafka_consumer_lag_messages',
  help: 'Consumer lag in messages by topic and consumer group.',
  labelNames: ['topic', 'consumer_group'] as const,
  registers: [registry],
});

export const cacheOperations = new Counter({
  name: 'smart_cache_operations_total',
  help: 'Redis cache operations by namespace and result.',
  labelNames: ['namespace', 'result'] as const,
  registers: [registry],
});

export const dbQueryDuration = new Histogram({
  name: 'smart_db_query_duration_seconds',
  help: 'Database query duration by operation.',
  labelNames: ['operation', 'model'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const quotaExceeded = new Counter({
  name: 'smart_quota_exceeded_total',
  help: 'Actions blocked by a plan quota, by tenant type, plan code and quota dimension.',
  labelNames: ['tenant_type', 'plan_code', 'dimension'] as const,
  registers: [registry],
});

export const sandboxExecutions = new Counter({
  name: 'smart_sandbox_executions_total',
  help: 'Code sandbox executions by language and outcome.',
  labelNames: ['language', 'outcome'] as const,
  registers: [registry],
});

export const certificatesIssued = new Counter({
  name: 'smart_certificates_issued_total',
  help: 'Certificates issued by track and headline tier.',
  labelNames: ['track_code', 'tier'] as const,
  registers: [registry],
});

export const verificationLookups = new Counter({
  name: 'smart_verification_lookups_total',
  help: 'Public certificate verification lookups by result.',
  labelNames: ['result'] as const,
  registers: [registry],
});

/* ------------------------ QLIX recalibration (ORION) ----------------------- */

export const qlixRecalibrationRuns = new Counter({
  name: 'smart_qlix_recalibration_runs_total',
  help: 'Monthly QLIX weight recalibration batch runs.',
  labelNames: ['published'] as const,
  registers: [registry],
});

export const qlixRecalibrationWeightVersion = new Gauge({
  name: 'smart_qlix_recalibration_weight',
  help: 'Published QLIX.default corroboration weight after recalibration.',
  labelNames: ['predictor'] as const,
  registers: [registry],
});

/* --------------------------- TPO provisioning ---------------------------- */

export const batchImportRows = new Counter({
  name: 'smart_tpo_batch_import_rows_total',
  help: 'Candidate rows processed by bulk provisioning outcome.',
  labelNames: ['outcome'] as const,
  registers: [registry],
});

/** Scrape endpoint payload. */
export async function collectMetrics(): Promise<string> {
  return registry.metrics();
}

export const METRICS_CONTENT_TYPE = registry.contentType;

/** Test-only: clears accumulated values without unregistering the metrics. */
export function resetMetrics(): void {
  registry.resetMetrics();
}
