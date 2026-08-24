# Certificate Module

**Owner:** Vishal Bharath R (@vishalbharath)  
**Contributors:** Vishal V, Vedika G  
**Reviewer:** Tino (@brittytino)

## Purpose & Boundary

Compiles issued certificates, digital hashes, and coordinates public verifications for cleared attempts. The module serves as a read-only cryptographic validation boundary for employers.

## Sprint 0 Status

Skeleton initialized. Controller class is decorated with `@ApiTags('certificate')` and registered under the main Nest application module. Placeholder endpoint returns module ownership metadata.

## Intentionally Pending (Not Implemented)

- Certificate PDF document generation (via headless engine)
- SHA-256 platform signature signing and QR code generation
- Public verify routing cache and rate-limiting
- Direct R2 file bucket uploading

## Ownership & Boundaries

Owned by Vishal Bharath R. Issuance is triggered exclusively by inbound Kafka events from the `evaluation` module (`smart.eval.completed`). Direct database querying of assessment attempts is strictly forbidden.
