# S6-VV — ExternalSignalConnection Prisma model

**Requested by:** Vishal Bharath R (S6-VB-01)
**Owner:** Vishal V
**Ticket:** S6-VV-XX (assign on sync)

## Why

`signal-ingestion` stores student external signal connections in Redis (`signal:conn:{userId}:{sourceId}`) as a v1 stub. Durable storage with encrypted credential refs is required before OAuth v2.

## Proposed schema

```prisma
model ExternalSignalConnection {
  id                String   @id @default(uuid())
  userId            String   @map("user_id")
  sourceId          String   @map("source_id") // GITHUB | HACKERRANK | LEETCODE
  externalAccountId String   @map("external_account_id")
  consentScopes     String[] @map("consent_scopes")
  status            String   @default("ACTIVE") // ACTIVE | ERROR | REVOKED
  lastFetchedAt     DateTime? @map("last_fetched_at")
  lastError         String?  @map("last_error")
  connectedAt       DateTime @default(now()) @map("connected_at")
  credentialsRef    String?  @map("credentials_ref")
  metadata          Json?    @map("metadata")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, sourceId])
  @@index([userId])
  @@map("external_signal_connections")
}
```

## Migration handoff to VB

When merged, VB will:

1. Replace `SignalConnectionStore` Redis reads/writes with Prisma
2. Run a one-time backfill script from Redis keys (optional, low volume)
3. Remove Redis connection stub from module README

## Non-goals (VV)

- Do not implement adapters or Kafka producers
- OAuth token encryption strategy is VV's call (Redis/Vault ref in `credentialsRef`)
