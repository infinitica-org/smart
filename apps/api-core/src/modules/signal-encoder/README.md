# signal-encoder

**Owner:** Ramansh (AI Engineer)

## Purpose & boundary

Rule-based encoder for passive platform signals. Subscribes to `smart.candidate.skills_discovered`, maps GitHub language breakdown to versioned skill dimensions, and hands vectors to `corroboration`.

HackerRank/LeetCode stubs return empty vectors until adapters are implemented.

## Kafka

- Consumes: `smart.candidate.skills_discovered`
- Produces: `smart.signal.encoded`
