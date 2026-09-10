/**
 * The most business-critical workflow in this platform: a candidate taking a
 * timed assessment attempt end to end —
 *
 *   login -> start attempt (Postgres write)
 *         -> [next-item (Redis cache-aside) -> submit-l1 (Redis write-through)] x N
 *         -> complete (Postgres write, emits Kafka smart.assessment.submitted)
 *
 * Measures both the whole workflow (business_flow_duration) and every
 * request inside it (per-request Trends), per the task's "measure the entire
 * workflow as well as individual requests".
 *
 * Scoped to L1 (MCQ) only, deliberately: L2 (code sandbox), L3/L4 (audio/video
 * AI evaluation via /assessment/evaluate-l3-l4, /defense/*) call real
 * Anthropic/Google AI providers billed against AI_MONTHLY_CEILING_USD
 * (apps/api-core/src/platform/config/env.ts). Load-testing those would spend
 * real money on every iteration, so this flow never calls them — see
 * safety.allowAiEvalLoad in config/index.js and "Known limitations" in
 * tools/load-tests/README.md. `smart.assessment.submitted`'s current
 * consumer (assessment-submitted-eval.consumer.ts) is a same-process,
 * non-AI stub today, so calling /assessment/complete here is safe.
 */
import { sleep } from 'k6';
import { check } from 'k6';
import { API_PREFIX, safety, urls } from '../config/index.js';
import { login } from '../helpers/auth.js';
import { authHeaders, thinkTime, timedGet, timedPost } from '../helpers/http.js';
import {
  businessFlowDuration,
  businessFlowErrors,
  kafkaEventsTriggered,
} from '../helpers/metrics.js';
import { activeTrackCode } from '../helpers/data.js';

const MAX_ITEMS = Number(__ENV.BUSINESS_FLOW_MAX_ITEMS || '5');

export function businessFlowScenario(user) {
  const startedAt = Date.now();
  let ok = true;

  const session = login(user.email, user.password);
  if (!session) {
    businessFlowErrors.add(1);
    return;
  }
  const headers = authHeaders(session.accessToken);

  const startRes = timedPost(
    `${urls.api}${API_PREFIX}/assessment/start`,
    JSON.stringify({ trackCode: activeTrackCode, levelNumber: 1 }),
    businessFlowDuration,
    'business_flow_start',
    { headers },
  );
  let attemptId;
  try {
    attemptId = JSON.parse(startRes.body).attemptId;
  } catch {
    attemptId = undefined;
  }
  if (!attemptId) {
    businessFlowErrors.add(1);
    return;
  }

  for (let i = 0; i < MAX_ITEMS; i += 1) {
    sleep(thinkTime(0.5, 1.5));

    const itemRes = timedGet(
      `${urls.api}${API_PREFIX}/assessment/${attemptId}/next-item`,
      businessFlowDuration,
      'business_flow_next_item',
      { headers },
    );
    let item;
    try {
      item = JSON.parse(itemRes.body).item;
    } catch {
      item = null;
    }
    if (!item) break; // item bank exhausted before MAX_ITEMS — a real, valid end state

    sleep(thinkTime(2, 6)); // reading + answering time, like a real candidate

    const answer =
      item.options && item.options.length > 0
        ? { kind: 'MCQ', selectedOptionIds: [item.options[0].optionId] }
        : { kind: 'MCQ', selectedOptionIds: [] };

    const submitRes = timedPost(
      `${urls.api}${API_PREFIX}/assessment/submit-l1`,
      JSON.stringify({ attemptId, itemId: item.itemId, answer, clientSequence: i + 1 }),
      businessFlowDuration,
      'business_flow_submit_l1',
      { headers },
    );
    if (submitRes.status >= 400) ok = false;
  }

  sleep(thinkTime(0.5, 1));

  const completeRes = timedPost(
    `${urls.api}${API_PREFIX}/assessment/complete`,
    // autoSubmitted stays false (a real submit, not the server-side timeout
    // path) and claimId is omitted — a plain, non-skill-linked completion,
    // per CompleteAttemptRequestSchema's own doc comment.
    JSON.stringify({ attemptId, autoSubmitted: false }),
    businessFlowDuration,
    'business_flow_complete',
    { headers },
  );
  const completed = check(completeRes, {
    'business flow: attempt completed': (r) => r.status === 200,
  });
  if (!completed) ok = false;
  else kafkaEventsTriggered.add(1); // one smart.assessment.submitted produced

  businessFlowDuration.add(Date.now() - startedAt, { name: 'business_flow_total' });
  businessFlowErrors.add(ok ? 0 : 1);

  if (safety.allowAiEvalLoad) {
    // Documented, not implemented: even with this opt-in flag, this flow does
    // not call L2/L3/L4 endpoints — that would need a dedicated, explicitly
    // reviewed scenario, not a flag flip. See README "Known limitations".
    console.warn(
      'ALLOW_AI_EVAL_LOAD=true has no effect on business-flow.js — L2/L3/L4 are not implemented here.',
    );
  }
}
