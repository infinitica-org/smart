# Prisma request — ProctoringSession (S4-RM-02)

**For:** Vishal V (migration steward, ADR-0007)  
**From:** Ramansh  
**Do not** run `prisma migrate dev` on this ticket.

Please add:

```
model ProctoringSession {
  id                  String    @id @default(uuid()) @db.Uuid
  attemptId           String    @unique @map("attempt_id") @db.Uuid
  attempt             Attempt   @relation(...)
  consentAt           DateTime? @map("consent_at") @db.Timestamptz(6)
  onboardingPassedAt  DateTime? @map("onboarding_passed_at") @db.Timestamptz(6)
  warningCount        Int       @default(0) @map("warning_count")
  warningLimit        Int       @default(15) @map("warning_limit")
  integrityScore      Int       @default(0) @map("integrity_score")
  deviceFingerprint   String?   @map("device_fingerprint")
  faceEmbeddingRef    String?   @map("face_embedding_ref")
}

```

Keep `IntegrityEvent.detail` JSON for per-event `kind` / `severity` / `class`. Optional `User.faceEmbedding` is PII — prefer object-store ref, not a column, unless you already have a pattern.
