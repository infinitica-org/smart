-- VER-01: append-only evidence record versions for auditability
CREATE TABLE "evidence_record_versions" (
    "id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "mutation_key" TEXT NOT NULL,
    "actor_id" UUID,
    "organization_id" UUID,
    "source" TEXT NOT NULL,
    "prior_verification_status" "EvidenceVerificationStatus",
    "new_verification_status" "EvidenceVerificationStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_record_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evidence_record_versions_evidence_id_version_number_key"
    ON "evidence_record_versions"("evidence_id", "version_number");

CREATE UNIQUE INDEX "evidence_record_versions_evidence_id_mutation_key_key"
    ON "evidence_record_versions"("evidence_id", "mutation_key");

CREATE INDEX "evidence_record_versions_evidence_id_created_at_idx"
    ON "evidence_record_versions"("evidence_id", "created_at");

ALTER TABLE "evidence_record_versions"
    ADD CONSTRAINT "evidence_record_versions_evidence_id_fkey"
    FOREIGN KEY ("evidence_id") REFERENCES "evidence_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
