CREATE TABLE "kafka_outbox" (
    "id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "partition_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "correlation_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kafka_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kafka_outbox_published_at_created_at_idx" ON "kafka_outbox"("published_at", "created_at");
