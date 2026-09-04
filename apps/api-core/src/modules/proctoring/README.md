# Proctoring module

**Owner:** Ramansh  
**Reviewers:** Vishal Bharath R (attempt `integrity_flag`), Satheswaran V (student overlay), Vishal V (Redis TTLs)

HMAC-signed sensor ingest, warning counters, hybrid lock (player lock + `FLAGGED_PROCTOR` / `UNDER_REVIEW`, never VOID), Blob payload via Redis, checkpoint Kafka to `apps/proctoring-cv`.

Technical events (`HEARTBEAT_LOST`, `NETWORK_LOSS`, `CAMERA_STATIC`) do not increment the warning counter.

Prisma `ProctoringSession` is requested of VV; Redis holds session telemetry until that migration.

Tests: `src/modules/proctoring/*.spec.ts`
