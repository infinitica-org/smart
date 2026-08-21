# Four seams (from TEAM.md §4.4)

Ignore these and integration will burn the runway.

| Seam | Between | Contract / rule |
|---|---|---|
| **Player ⇄ Attempt API** | Satheswaran ⇄ Vishal Bharath | Server is the clock. Client drafts; server owns validity, expiry, next item. DTOs: `AttemptSessionDto`, `NextItemDto`. |
| **Attempt ⇄ Evaluation** | Vishal Bharath ⇄ Ramansh | Handoff **only** via `smart.assessment.submitted` → result on `smart.eval.completed`. No direct service call. |
| **Evaluation ⇄ Cut scores** | Ramansh ⇄ Vedika | Eval emits raw score; **calibration** owns tier via published `cut_scores`. Never hardcode thresholds in evaluation. |
| **Content ⇄ Delivery** | Vedika ⇄ Vishal Bharath | Items served only from `catalog` parallel forms; delivery never queries `items` ad hoc. |

## Platform touchpoints (Vishal V)

- Redis session primitives, rate limits, Kafka outbox, and schema keep Attempt/Eval decoupled.
- Cache invalidation on `smart.assessment.submitted` / `smart.track.updated` is VV's S2 job — consumers must not `DEL` keys ad hoc without an agreed event.
- Schema changes for seam tables go through VV (migration steward).
