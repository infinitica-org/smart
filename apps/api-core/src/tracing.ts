/**
 * OpenTelemetry bootstrap — imported as the FIRST line of `main.ts`, before
 * `fastify`, `pg`, `ioredis`, `kafkajs` or anything that transitively requires
 * them. Auto-instrumentation patches those modules' exports at `require()`
 * time; importing this after they are loaded elsewhere would silently
 * instrument nothing.
 *
 * Entirely opt-in: no `OTEL_EXPORTER_OTLP_ENDPOINT` means this file is a
 * no-op. There is no OpenTelemetry anywhere else in this repo today — this is
 * a first-time addition, scoped to api-core only, so it stays inert unless a
 * deployment explicitly points it at a collector (e.g. `http://tempo:4318`
 * under the `obs` compose profile).
 *
 * Owner: perf-testing follow-up (see docs/adr/0015-perf-testing-observability.md).
 */
import { loadDotenv } from './platform/config/load-dotenv.js';
// Type-only import: erased at compile time, so it has no effect on the
// require() ordering the comment below depends on.
import type { Env } from './platform/config/env.js';

// This file is imported before `./platform/config/load-dotenv.bootstrap.js`
// runs (main.ts imports tracing first), so it loads .env itself rather than
// risk reading an empty OTEL_EXPORTER_OTLP_ENDPOINT from an unpopulated
// process.env — the same dotenv path resolution `main.ts` uses.
loadDotenv();

// Deliberately `require()`'d here, AFTER loadDotenv() above, rather than a
// static top-of-file `import` — ES imports are hoisted above this file's own
// statements even under CommonJS output, which would make env.ts validate
// process.env BEFORE loadDotenv() populated it from .env. Using the
// validated `env` module (not raw `process.env`) is required by this repo's
// own lint rule (DEFINITION_OF_DONE.md §5) and env.ts only imports 'zod', so
// requiring it here doesn't affect instrumentation ordering below.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { env } = require('./platform/config/env.js') as { env: Env };

const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

if (otlpEndpoint) {
  // Imports deliberately deferred inside this branch: requiring
  // @opentelemetry/instrumentation-* itself is harmless, but keeping the whole
  // SDK out of the module graph when tracing is off avoids any startup cost
  // for the (default) case where nobody configured a collector.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const { Resource } = require('@opentelemetry/resources');
  const {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
  } = require('@opentelemetry/semantic-conventions');
  const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const samplerRatio = env.OTEL_TRACES_SAMPLER_RATIO;

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: 'smart-api-core',
      [ATTR_SERVICE_VERSION]: env.APP_VERSION,
    }),
    traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
    sampler: new TraceIdRatioBasedSampler(Number.isFinite(samplerRatio) ? samplerRatio : 1),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Filesystem spans are extremely high-volume and add little value for
        // an HTTP/Kafka/DB service; disabling keeps trace volume proportional
        // to request volume instead of file-read volume.
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.once('SIGTERM', () => void sdk.shutdown());
  process.once('SIGINT', () => void sdk.shutdown());

  // eslint-disable-next-line no-console
  console.log(`[tracing] OpenTelemetry enabled, exporting to ${otlpEndpoint}`);
}
