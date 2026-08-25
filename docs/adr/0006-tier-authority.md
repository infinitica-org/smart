# ADR-0006: Tier assignment authority

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino + Ramansh
- **Ticket:** S0-TN-04

## Context

If UI or LLM code awards Gold/Silver/Bronze, methodology becomes non-reproducible and unverifiable.

## Decision

- Practitioner Angoff panels set cut scores (mean ± SD).
- AI returns evidence scores against BARS anchors — it does **not** award the metal.
- Only **`@smart/scoring-engine.assignTier()`** (or successor pure function in that package) maps a score + cut band → tier.
- Cohen's κ below threshold pauses automated scoring (see scoring-engine + calibration).

## Consequences

- Certificate issuance reads tier from the engine output, never from a prompt.
- Changing tier math requires a contracts/scoring PR and this ADR amendment.
