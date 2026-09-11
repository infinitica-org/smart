# signal-ingestion

Passive external signal adapters (GitHub refresh, HackerRank, LeetCode) that emit
`smart.signal.ingested` for the signal-encoder pipeline.

**Owner:** Vishal Bharath R (VB)

## Boundaries

- **Produces:** `smart.signal.ingested` (never `smart.signal.encoded`)
- **Does not:** call `CorroborationService`, write `SkillClaim`, or change verification status
- **Encoder consumer:** Ramansh (`signal-ingested.encoder-consumer.ts`)

## Connection storage

Redis hash `signal:conn:{userId}:{sourceId}` until VV lands `ExternalSignalConnection` Prisma model
(see `docs/delivery/issues/S6-VV-external-signal-connection-prisma.md`).

## Environment

| Variable               | Required    | Notes                                          |
| ---------------------- | ----------- | ---------------------------------------------- |
| `GITHUB_API_TOKEN`     | Recommended | Raises GitHub rate limit (via existing client) |
| `HACKERRANK_API_TOKEN` | Optional    | Not used in v1 public-profile path             |
| Redis                  | Yes         | Connections, cache, cooldown, dedupe           |

## Degraded mode

- Third-party fetch failures set connection `status: ERROR` and audit `signal.fetch.failed`
- Circuit breaker opens after 5 failures / 60s window, resets after 120s
- Partial HackerRank payloads (missing contests) still emit a valid envelope

## Rate limits

- `POST /signals/refresh` uses `corroboration.refresh` (4/hr) + per-source 15min cooldown
- LeetCode global token bucket: `leetcode:api:global` (1 req/s)
