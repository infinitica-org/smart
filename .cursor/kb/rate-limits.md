# Rate limits

Implementation must read `packages/contracts/src/domain/rate-limits.ts` (single source). Narrative: `ARCHITECTURE.md` §4.

## Role defaults (per minute)

| Role | Limit | Burst | Scope |
|---|---:|---:|---|
| Super Admin | 500 | 100 | USER |
| Institution Admin (TPO) | 200 | 50 | INSTITUTION |
| Placement Staff | 150 | 40 | USER |
| Student (general) | 60 | 15 | USER |
| Student (active assessment submit) | 10 | 3 | ATTEMPT |
| Public / unauthenticated | 20 | 5 | IP |

## Endpoint highlights

| Endpoint | Limit | Scope | Redis key shape |
|---|---:|---|---|
| `/auth/login` | 10/min | IP | `rl:auth:ip:{ip}` |
| `/auth/refresh` | 20/min | USER | `rl:refresh:{user_id}` |
| `/assessment/submit-l1` | 10/min | ATTEMPT | `rl:l1_sub:{attempt_id}` |
| `/assessment/compile-l2` | 10/min | USER | `rl:l2_compile:{candidate_id}` |
| `/assessment/evaluate-l3-l4` | 5/min | USER | `rl:l3_eval:{candidate_id}` |
| `/eval/claude` | 200 RPM / 10k TPM | SERVICE | `rl:llm:claude_proxy` |
| `/verify/:id` | 20/min | IP | `rl:verify:ip:{ip}` |
| `/placement/match` | 30/min | INSTITUTION | `rl:match:inst:{inst_id}` |

## Response contract

Always set: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` when limited.

429 body shape: `error: rate_limit_exceeded`, `retry_after_seconds`, `limit`, `window`.

Publish `smart.rate_limit.exceeded` for observability / integrity review.
