/**
 * Custom k6 metrics, declared once and imported by every scenario/test — the
 * same "one registry, not ad hoc per file" convention api-core's own
 * packages/observability/src/metrics.ts uses for Prometheus.
 */
import { Counter, Rate, Trend } from 'k6/metrics';

export const frontendLatency = new Trend('frontend_latency', true);
export const apiLatency = new Trend('api_latency', true);
export const loginLatency = new Trend('login_latency', true);
export const searchLatency = new Trend('search_latency', true);
export const writeLatency = new Trend('write_latency', true);

/** Whole-workflow duration, in addition to each request inside it — the task's own "measure the entire workflow as well as individual requests". */
export const businessFlowDuration = new Trend('business_flow_duration', true);
export const businessFlowErrors = new Rate('business_flow_errors');

/** Cache-stampede scenario: how many of the N concurrent first-requests actually missed the cache (ideally ~1, not ~N). */
export const cacheStampedeMisses = new Counter('cache_stampede_misses');
export const cacheStampedeHits = new Counter('cache_stampede_hits');

/** Kafka backpressure scenario: attempts completed (each triggers one smart.assessment.submitted produce). */
export const kafkaEventsTriggered = new Counter('kafka_events_triggered');
