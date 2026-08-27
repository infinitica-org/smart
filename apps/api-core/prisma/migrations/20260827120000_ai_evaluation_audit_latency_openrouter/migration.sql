-- S1-RM-04 / ADR-0007: schema only (Vishal V steward).
-- 1. Persist gateway completion latency on the audit row (ticket AC).
-- 2. Align AiProvider with @smart/contracts so OpenRouter is not stored as Anthropic.

ALTER TYPE "AiProvider" ADD VALUE 'OPENROUTER';

ALTER TABLE "ai_evaluation_audits" ADD COLUMN "latency_ms" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ai_evaluation_audits" ALTER COLUMN "latency_ms" DROP DEFAULT;
