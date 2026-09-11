/**
 * Database- and Redis-heavy write path: start an attempt (Postgres write),
 * fetch the next item (Redis item-bank cache-aside — see cache-stampede.js
 * for the same cache-aside under deliberate concurrency), save an answer
 * draft (write-through Redis, `POST /assessment/submit-l1`).
 *
 * Deliberately does NOT call `/assessment/complete` — that is
 * scenarios/business-flow.js, kept separate so "writes" traffic never
 * triggers the Kafka/AI-evaluation fan-out on its own.
 */
import { sleep } from 'k6';
import { API_PREFIX, urls } from '../config/index.js';
import { login } from '../helpers/auth.js';
import { authHeaders, thinkTime, timedGet, timedPost } from '../helpers/http.js';
import { writeLatency } from '../helpers/metrics.js';
import { activeTrackCode } from '../helpers/data.js';

export function writesScenario(user) {
  const session = login(user.email, user.password);
  if (!session) return;
  const headers = authHeaders(session.accessToken);

  const startRes = timedPost(
    `${urls.api}${API_PREFIX}/assessment/start`,
    JSON.stringify({ trackCode: activeTrackCode, levelNumber: 1 }),
    writeLatency,
    'writes_start_attempt',
    { headers },
  );
  let attemptId;
  try {
    attemptId = JSON.parse(startRes.body).attemptId;
  } catch {
    return;
  }
  if (!attemptId) return;
  sleep(thinkTime(0.2, 0.5));

  const itemRes = timedGet(
    `${urls.api}${API_PREFIX}/assessment/${attemptId}/next-item`,
    writeLatency,
    'writes_next_item',
    { headers },
  );
  let item;
  try {
    item = JSON.parse(itemRes.body).item;
  } catch {
    return;
  }
  if (!item) return; // attempt already exhausted its item bank this run

  const answer =
    item.options && item.options.length > 0
      ? { kind: 'MCQ', selectedOptionIds: [item.options[0].optionId] }
      : { kind: 'MCQ', selectedOptionIds: [] };

  sleep(thinkTime(1, 3)); // reading time before answering, like a real candidate

  timedPost(
    `${urls.api}${API_PREFIX}/assessment/submit-l1`,
    JSON.stringify({
      attemptId,
      itemId: item.itemId,
      answer,
      clientSequence: 1,
    }),
    writeLatency,
    'writes_submit_l1',
    { headers },
  );
}
