# ADR-0005: AI provider failover

- **Status:** Accepted
- **Date:** 2026-08-21
- **Deciders:** Tino + Ramansh
- **Ticket:** S0-TN-04

## Context

Evaluation must survive provider outages without every module embedding SDKs.

## Decision

- Only **`ai-gateway`** talks to LLMs.
- Primary: Anthropic Claude. Fallback: Google Gemini.
- Prompts are versioned in `@smart/prompts`; outputs schema-validated via contracts.
- Invalid or failed primary responses escalate to fallback; persistent failure escalates to human/ops path — never silent invent.

## Consequences

- Direct SDK imports outside `ai-gateway` are forbidden.
- Provider keys stay in validated config; never in logs.
