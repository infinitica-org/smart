-- Enable pgvector and reserve a nullable embedding column for S1-RM-03.
-- Owner: Vishal V (schema steward). Ramansh owns the write path in Sprint 1.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "competencies" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
