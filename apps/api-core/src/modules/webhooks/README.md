# Webhooks Module

**Owner:** Vishal Bharath R (@vishalbharath)  
**Contributors:** Vishal V  
**Reviewer:** Tino (@brittytino)

## Purpose & Boundary

Provides outbound HTTP webhook event broadcasting to institutional partner systems. Implements retry policies and signature headers to guarantee secure, idempotent integration.

## Sprint 0 Status

Skeleton files initialized. Webhooks controller tagged with `@ApiTags('webhooks')` and loaded in Nest App module. Controller returns metadata in its placeholder endpoint.

## Intentionally Pending (Not Implemented)

- Webhook subscription registries and endpoints
- HTTPS request dispatcher with HMAC signature calculation (`x-smart-signature`)
- Scheduling retry loops, exponential backoffs, and DLQ persistence
- Kafka topic handlers for subscribing to platform events

## Ownership & Boundaries

Owned by Vishal Bharath R. Consumes internal transaction events to fanout to external endpoints. This module must not expose any transactional endpoints directly to candidates.
