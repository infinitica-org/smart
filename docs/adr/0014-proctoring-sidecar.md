# ADR-0014: Proctoring CV sidecar and snapshot pipeline

- **Status:** Proposed
- **Date:** 2026-09-03
- **Deciders:** Tino (required), Ramansh
- **Ticket:** S4-RM-02

## Context

ADR-0001 keeps V1 as a NestJS modular monolith. The MCQ proctoring platform already has CPU-first InsightFace / MediaPipe / Whisper providers. Porting those libraries into Node would fork the models and blow the 400-LOC PR budget.

PRD v1 requires async AI-heavy work and snapshot (not continuous) video.

## Decision

1. Webcam frames are **periodic snapshots**. The student client uploads an object key; api-core emits `smart.proctoring.snapshot.ready`.
2. A small Python HTTP sidecar (`apps/proctoring-cv`) analyzes frames. CI and local default use a **stub** that returns no violations.
3. Nest owns HMAC ingest, Redis warning counters, Blob fan-out, hybrid lock, and integrity flags. Assessment item delivery stays in `assessment`.
4. Raw embeddings and frames are not logged. DPDP consent is required before getUserMedia.

## Consequences

- Tino must accept this ADR before a non-stub CV image ships.
- Vishal V authors `ProctoringSession` Prisma when ready; Redis is the interim store (TTL on every key).
- Unlimited / unsigned integrity endpoints still fail review.
