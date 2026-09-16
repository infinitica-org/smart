# Proctoring module

**Owner:** Ramansh  
**Reviewers:** Vishal Bharath R (attempt `integrity_flag`), Satheswaran V (student overlay), Vishal V (Redis TTLs)

HMAC-signed sensor ingest, warning counters, hybrid lock (player lock + `FLAGGED_PROCTOR` / `UNDER_REVIEW`, never VOID), Blob payload via Redis, presigned JPEG snapshots (640×360 @ 1s), **sync** checkpoint CV via `apps/proctoring-cv` (YuNet + head pose + unified YOLO object detect when `PROCTORING_CV_PROVIDER=real`). Kafka event is audit-only; consumer skips keys already processed synchronously.

Technical events (`HEARTBEAT_LOST`, `NETWORK_LOSS`, `CAMERA_STATIC`) do not increment the warning counter.

Prisma `ProctoringSession` is requested of VV; Redis holds session telemetry until that migration.

Tests: `src/modules/proctoring/*.spec.ts`
