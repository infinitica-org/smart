# Kafka topics

Payload schemas live in `@smart/contracts` (`events/topics.ts`, `events/payloads.ts`). Changing a payload = contract PR + every consumer named.

| Topic | Producer-owner | Consumers |
|---|---|---|
| `smart.user.created` / `updated` | **Vishal V** | Vedika (analytics) |
| `smart.assessment.started` / `submitted` | Vishal Bharath | Ramansh (eval), **Vishal V** (cache invalidation) |
| `smart.eval.requested` | Ramansh | Ramansh (ai-gateway) |
| `smart.eval.completed` | Ramansh | Vishal Bharath (cert), Vedika |
| `smart.track.updated` | Vedika | **Vishal V** (cache), Vishal Bharath |
| `smart.certificate.issued` | Vishal Bharath | webhooks, analytics |
| `smart.placement.matched` | Vedika | webhooks, analytics |
| `smart.rate_limit.exceeded` | **Vishal V** | observability, integrity review |

## Platform notes

- VV owns producer/consumer base + **outbox** + DLQ (S1-VV-07).
- Prefer outbox over fire-and-forget so DB commit and publish stay consistent.
- Feature modules must not open raw Kafka clients — go through `platform/kafka`.
