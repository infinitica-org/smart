# Assessment Module

**Owner:** Vishal Bharath R (@vishalbharath)  
**Contributors:** Vishal V, Satheswaran V, Ramansh, Vedika G  
**Reviewer:** Tino (@brittytino)

## Purpose & Boundary

Orchestrates candidate attempts, level eligibility/gating, and deliverable items during verification assessments. This module is the authority on timed attempt transitions and integrity enforcement.

## Sprint 0 Status

Skeleton files initialized. Controller and service structures registered in `AppModule` with `@ApiTags` applied for OpenAPI spec routing. Placeholder endpoint returns module ownership metadata.

## Intentionally Pending (Not Implemented)

- Attempt lifecycle states (Start, Resume, SaveDraft)
- Sandbox executor interfacing (L2 code sandbox)
- Integrity tracking (DevTools detection, browser tab focus blurs)
- Kafka message publishing (e.g., `smart.assessment.submitted` events)
- DB storage operations and Redis memory cache locks

## Ownership & Boundaries

Any structural or dependency injection updates inside this module require review by Vishal Bharath R. Communication with external modules (like `evaluation`) should occur asynchronously via event boundaries to prevent coupling.
