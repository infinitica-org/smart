# signal-encoder

**Owner:** Ramansh (AI Engineer)

## Purpose & boundary

Rule-based encoder for passive platform signals. Project QLIX evidence (post-defense), OAuth-ingested platform profiles, and verified credentials feed `corroboration` fusion.

Onboarding `smart.candidate.skills_discovered` is **not** encoded here — assessment owns BEGINNER claim auto-declaration from that event; project evidence enters fusion via QLIX after defense.

## Kafka

- Consumes: `smart.signal.ingested`, `smart.credential.verified`, `smart.project.defense.completed`
- Produces: `smart.signal.encoded` (from `signal.ingested` path)
